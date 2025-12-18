import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  DelegationTarget,
  Expert,
  RunParamsInput,
  RunSetting,
  ToolResult,
  Usage,
} from "@perstack/core"
import {
  buildDelegateToState,
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
    checkpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (
      params: RunParamsInput,
      options?: { returnOnDelegationComplete?: boolean },
    ) => Promise<Checkpoint>,
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
    checkpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    _runFn: (params: RunParamsInput) => Promise<Checkpoint>,
  ): Promise<DelegationExecutionResult> {
    if (delegations.length !== 1) {
      throw new Error("SingleDelegationStrategy requires exactly one delegation")
    }

    const result = buildDelegateToState(setting, checkpoint, parentExpert)
    return {
      nextSetting: result.setting,
      nextCheckpoint: result.checkpoint,
    }
  }
}

/**
 * Strategy for parallel delegation - executes all delegations in parallel.
 */
export class ParallelDelegationStrategy implements DelegationStrategy {
  async execute(
    delegations: DelegationTarget[],
    setting: RunSetting,
    checkpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (
      params: RunParamsInput,
      options?: { returnOnDelegationComplete?: boolean },
    ) => Promise<Checkpoint>,
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
        this.executeSingleDelegation(delegation, setting, checkpoint, parentExpert, runFn),
      ),
    )

    const [firstResult, ...restResults] = allResults
    if (!firstResult) {
      throw new Error("No delegation results")
    }

    // Aggregate results
    const aggregatedUsage = allResults.reduce(
      (acc, result) => sumUsage(acc, result.deltaUsage),
      checkpoint.usage,
    )

    const maxStepNumber = Math.max(...allResults.map((r) => r.stepNumber))

    const restToolResults: ToolResult[] = restResults.map((result) => ({
      id: result.toolCallId,
      skillName: `delegate/${result.expertKey}`,
      toolName: result.toolName,
      result: [{ type: "textPart", id: createId(), text: result.text }],
    }))

    const processedToolCallIds = new Set(remainingDelegations.map((d) => d.toolCallId))
    const remainingPendingToolCalls = checkpoint.pendingToolCalls?.filter(
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

    const nextCheckpoint: Checkpoint = {
      ...checkpoint,
      status: "stoppedByDelegate",
      delegateTo: undefined,
      stepNumber: maxStepNumber,
      usage: aggregatedUsage,
      pendingToolCalls: remainingPendingToolCalls?.length ? remainingPendingToolCalls : undefined,
      partialToolResults: [...(checkpoint.partialToolResults ?? []), ...restToolResults],
    }

    return { nextSetting, nextCheckpoint }
  }

  private async executeSingleDelegation(
    delegation: DelegationTarget,
    parentSetting: RunSetting,
    parentCheckpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    runFn: (
      params: RunParamsInput,
      options?: { returnOnDelegationComplete?: boolean },
    ) => Promise<Checkpoint>,
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
      stepNumber: parentCheckpoint.stepNumber,
      messages: [],
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
        checkpointId: parentCheckpoint.id,
      },
      usage: createEmptyUsage(),
      contextWindow: parentCheckpoint.contextWindow,
    }

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
