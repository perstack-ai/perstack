import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  DelegationTarget,
  Expert,
  RunParamsInput,
  RunSetting,
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
 */
export type DelegationRunOptions = {
  returnOnDelegationComplete?: boolean
}

/**
 * Minimal checkpoint context required for delegation.
 * Intentionally excludes messages and other context to enforce
 * the principle that child runs don't inherit parent context.
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
}

/**
 * Strategy interface for handling delegations.
 * Implementations differ in how they execute delegations (single vs parallel).
 */
export interface DelegationStrategy {
  /**
   * Execute delegations and return the next setting/checkpoint for the run loop.
   */
  execute(
    delegations: DelegationTarget[],
    setting: RunSetting,
    context: DelegationContext,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (params: RunParamsInput, options?: DelegationRunOptions) => Promise<Checkpoint>,
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
  ): Promise<DelegationExecutionResult> {
    if (delegations.length !== 1) {
      throw new Error("SingleDelegationStrategy requires exactly one delegation")
    }

    // Use the delegation parameter directly, not checkpoint.delegateTo
    const delegation = delegations[0]
    const { expert, toolCallId, toolName, query } = delegation

    const nextSetting: RunSetting = {
      ...setting,
      expertKey: expert.key,
      input: { text: query },
    }

    const nextCheckpoint: Checkpoint = {
      id: context.id,
      jobId: setting.jobId,
      runId: setting.runId,
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
        this.executeSingleDelegation(delegation, setting, context, parentExpert, runFn),
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

    const nextSetting: RunSetting = {
      ...setting,
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

    // Build next checkpoint - preserve delegatedBy for nested delegations
    const nextCheckpoint: Checkpoint = {
      id: context.id,
      jobId: setting.jobId,
      runId: setting.runId,
      status: "stoppedByDelegate",
      stepNumber: maxStepNumber,
      messages: [], // Child doesn't inherit parent messages
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
      },
      usage: createEmptyUsage(),
      contextWindow: parentContext.contextWindow,
    }

    // Pass returnOnDelegationComplete - parent options are inherited through run.ts
    const resultCheckpoint = await runFn(
      { setting: delegateSetting, checkpoint: delegateCheckpoint },
      { returnOnDelegationComplete: true },
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
      throw new Error("Delegation error: delegation result message does not contain text")
    }

    return {
      toolCallId,
      toolName,
      expertKey,
      text: textPart.text,
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
  }
}
