import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  DelegationTarget,
  Expert,
  Message,
  RunEvent,
  RunParamsInput,
  RunSetting,
  RuntimeEvent,
  ToolCall,
  ToolResult,
  Usage,
} from "@perstack/core"

/** Reference to the parent Expert that delegated */
type DelegatedBy = NonNullable<Checkpoint["delegatedBy"]>

import {
  buildDelegationReturnState,
  createEmptyUsage,
  type DelegationStateResult,
  sumUsage,
} from "../helpers/index.js"

export type DelegationResult = {
  toolCallId: string
  toolName: string
  expertKey: string
  text: string
  stepNumber: number
  deltaUsage: Usage
}

export type DelegationExecutionResult = {
  nextSetting: RunSetting
  nextCheckpoint: Checkpoint
}

/**
 * Run options that can be passed to child delegation runs.
 * Extends key callbacks from parent options to ensure checkpoint persistence
 * and event emission work correctly for delegated runs.
 */
export type DelegationRunOptions = {
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeEvent?: (event: RunEvent) => Promise<void>
  returnOnDelegationComplete?: boolean
}

/**
 * Checkpoint context required for delegation.
 * Note: messages are included so the PARENT can resume its conversation
 * after parallel delegation completes. Child runs start with empty messages.
 */
export type DelegationContext = {
  /** Checkpoint ID for delegatedBy reference */
  id: string
  /** Current step number */
  stepNumber: number
  /** Context window size (optional, inherited from parent) */
  contextWindow?: number
  /** Current usage for aggregation */
  usage: Usage
  /** Pending tool calls to filter */
  pendingToolCalls?: ToolCall[]
  /** Partial tool results to append to */
  partialToolResults?: ToolResult[]
  /** Parent delegation reference (preserved for nested delegations) */
  delegatedBy?: DelegatedBy
  /** Parent's message history (restored when parent resumes after delegation) */
  messages: Message[]
}

/**
 * Strategy interface for handling delegations.
 * Implementations differ in how they execute delegations (single vs parallel).
 */
export interface DelegationStrategy {
  /**
   * Execute delegations and return the next setting/checkpoint for the run loop.
   * @param parentOptions - Options from the parent run to be inherited by child runs
   */
  execute(
    delegations: DelegationTarget[],
    setting: RunSetting,
    context: DelegationContext,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (params: RunParamsInput, options?: DelegationRunOptions) => Promise<Checkpoint>,
    parentOptions?: DelegationRunOptions,
  ): Promise<DelegationExecutionResult>
}

/**
 * Strategy for single delegation - does not execute, just prepares next state.
 * The actual execution happens in the next iteration of the run loop.
 */
export class SingleDelegationStrategy implements DelegationStrategy {
  async execute(
    delegations: DelegationTarget[],
    setting: RunSetting,
    context: DelegationContext,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    _runFn: (params: RunParamsInput, options?: DelegationRunOptions) => Promise<Checkpoint>,
    _parentOptions?: DelegationRunOptions,
  ): Promise<DelegationExecutionResult> {
    if (delegations.length !== 1) {
      throw new Error("SingleDelegationStrategy requires exactly one delegation")
    }

    // Use the delegation parameter directly, not checkpoint.delegateTo
    const delegation = delegations[0]
    const { expert, toolCallId, toolName, query } = delegation

    // New runId for child expert - each delegation gets its own run
    const childRunId = createId()

    const nextSetting: RunSetting = {
      ...setting,
      runId: childRunId,
      expertKey: expert.key,
      input: { text: query },
    }

    const nextCheckpoint: Checkpoint = {
      id: context.id,
      jobId: setting.jobId,
      runId: childRunId,
      status: "init",
      stepNumber: context.stepNumber,
      messages: [], // Child starts fresh
      expert: {
        key: expert.key,
        name: expert.name,
        version: expert.version,
      },
      delegatedBy: {
        expert: {
          key: parentExpert.key,
          name: parentExpert.name,
          version: parentExpert.version,
        },
        toolCallId,
        toolName,
        checkpointId: context.id,
        runId: setting.runId, // Parent's runId for traceability
      },
      usage: context.usage,
      contextWindow: context.contextWindow,
      pendingToolCalls: undefined,
      partialToolResults: undefined,
    }

    return { nextSetting, nextCheckpoint }
  }
}

/**
 * Strategy for parallel delegation - executes all delegations in parallel.
 */
export class ParallelDelegationStrategy implements DelegationStrategy {
  async execute(
    delegations: DelegationTarget[],
    setting: RunSetting,
    context: DelegationContext,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (params: RunParamsInput, options?: DelegationRunOptions) => Promise<Checkpoint>,
    parentOptions?: DelegationRunOptions,
  ): Promise<DelegationExecutionResult> {
    if (delegations.length < 2) {
      throw new Error("ParallelDelegationStrategy requires at least two delegations")
    }

    const [firstDelegation, ...remainingDelegations] = delegations
    if (!firstDelegation) {
      throw new Error("No delegations found")
    }

    // Execute all delegations in parallel
    const allResults = await Promise.all(
      delegations.map((delegation) =>
        this.executeSingleDelegation(
          delegation,
          setting,
          context,
          parentExpert,
          runFn,
          parentOptions,
        ),
      ),
    )

    const [firstResult, ...restResults] = allResults
    if (!firstResult) {
      throw new Error("No delegation results")
    }

    // Aggregate results
    const aggregatedUsage = allResults.reduce(
      (acc, result) => sumUsage(acc, result.deltaUsage),
      context.usage,
    )

    const maxStepNumber = Math.max(...allResults.map((r) => r.stepNumber))

    const restToolResults: ToolResult[] = restResults.map((result) => ({
      id: result.toolCallId,
      skillName: `delegate/${result.expertKey}`,
      toolName: result.toolName,
      result: [{ type: "textPart", id: createId(), text: result.text }],
    }))

    const processedToolCallIds = new Set(remainingDelegations.map((d) => d.toolCallId))
    const remainingPendingToolCalls = context.pendingToolCalls?.filter(
      (tc) => !processedToolCallIds.has(tc.id) && tc.id !== firstDelegation.toolCallId,
    )

    // New runId for delegation return - parent resumes with new run segment
    const returnRunId = createId()

    const nextSetting: RunSetting = {
      ...setting,
      runId: returnRunId,
      expertKey: parentExpert.key,
      input: {
        interactiveToolCallResult: {
          toolCallId: firstResult.toolCallId,
          toolName: firstResult.toolName,
          skillName: `delegate/${firstResult.expertKey}`,
          text: firstResult.text,
        },
      },
    }

    // Build next checkpoint - restore parent's messages for continuation
    const nextCheckpoint: Checkpoint = {
      id: context.id,
      jobId: setting.jobId,
      runId: returnRunId,
      status: "stoppedByDelegate",
      stepNumber: maxStepNumber,
      messages: context.messages, // Restore parent's conversation history
      expert: {
        key: parentExpert.key,
        name: parentExpert.name,
        version: parentExpert.version,
      },
      usage: aggregatedUsage,
      contextWindow: context.contextWindow,
      delegatedBy: context.delegatedBy, // Preserve parent reference for nested delegations
      delegateTo: undefined,
      pendingToolCalls: remainingPendingToolCalls?.length ? remainingPendingToolCalls : undefined,
      partialToolResults: [...(context.partialToolResults ?? []), ...restToolResults],
    }

    return { nextSetting, nextCheckpoint }
  }

  private async executeSingleDelegation(
    delegation: DelegationTarget,
    parentSetting: RunSetting,
    parentContext: DelegationContext,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (params: RunParamsInput, options?: DelegationRunOptions) => Promise<Checkpoint>,
    parentOptions?: DelegationRunOptions,
  ): Promise<DelegationResult> {
    const { expert, toolCallId, toolName, query } = delegation
    const delegateRunId = createId()

    const delegateSetting: RunSetting = {
      ...parentSetting,
      runId: delegateRunId,
      expertKey: expert.key,
      input: { text: query },
    }

    const delegateCheckpoint: Checkpoint = {
      id: createId(),
      jobId: parentSetting.jobId,
      runId: delegateRunId,
      status: "init",
      stepNumber: parentContext.stepNumber,
      messages: [], // Child starts fresh - no parent context inheritance
      expert: {
        key: expert.key,
        name: expert.name,
        version: expert.version,
      },
      delegatedBy: {
        expert: {
          key: parentExpert.key,
          name: parentExpert.name,
          version: parentExpert.version,
        },
        toolCallId,
        toolName,
        checkpointId: parentContext.id,
        runId: parentSetting.runId,
      },
      usage: createEmptyUsage(),
      contextWindow: parentContext.contextWindow,
    }

    // Merge parent options with returnOnDelegationComplete to ensure child runs
    // inherit callbacks for checkpoint persistence and event emission
    const resultCheckpoint = await runFn(
      { setting: delegateSetting, checkpoint: delegateCheckpoint },
      { ...parentOptions, returnOnDelegationComplete: true },
    )

    return this.extractDelegationResult(resultCheckpoint, toolCallId, toolName, expert.key)
  }

  private extractDelegationResult(
    checkpoint: Checkpoint,
    toolCallId: string,
    toolName: string,
    expertKey: string,
  ): DelegationResult {
    const lastMessage = checkpoint.messages[checkpoint.messages.length - 1]
    if (!lastMessage || lastMessage.type !== "expertMessage") {
      throw new Error("Delegation error: delegation result message is incorrect")
    }

    const textPart = lastMessage.contents.find((c) => c.type === "textPart")
    if (!textPart || textPart.type !== "textPart") {
      console.warn(
        `Delegation result from ${expertKey} has no text content. Parent expert will receive empty string.`,
      )
    }

    return {
      toolCallId,
      toolName,
      expertKey,
      text: textPart?.type === "textPart" ? textPart.text : "",
      stepNumber: checkpoint.stepNumber,
      deltaUsage: checkpoint.usage,
    }
  }
}

/**
 * Factory to select the appropriate delegation strategy.
 */
export function selectDelegationStrategy(delegationCount: number): DelegationStrategy {
  if (delegationCount === 1) {
    return new SingleDelegationStrategy()
  }
  return new ParallelDelegationStrategy()
}

/**
 * Helper to build state when returning from a completed delegation to parent.
 */
export function buildReturnFromDelegation(
  currentSetting: RunSetting,
  resultCheckpoint: Checkpoint,
  parentCheckpoint: Checkpoint,
): DelegationStateResult {
  return buildDelegationReturnState(currentSetting, resultCheckpoint, parentCheckpoint)
}

/**
 * Extract DelegationContext from a Checkpoint.
 */
export function extractDelegationContext(checkpoint: Checkpoint): DelegationContext {
  return {
    id: checkpoint.id,
    stepNumber: checkpoint.stepNumber,
    contextWindow: checkpoint.contextWindow,
    usage: checkpoint.usage,
    pendingToolCalls: checkpoint.pendingToolCalls,
    partialToolResults: checkpoint.partialToolResults,
    delegatedBy: checkpoint.delegatedBy, // Preserve for nested delegations
    messages: checkpoint.messages, // Preserve for parent continuation after delegation
  }
}
