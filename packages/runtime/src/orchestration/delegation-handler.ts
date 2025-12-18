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
} from "../helpers/index.js"

// Use a minimal type to avoid circular dependency with run-orchestrator
type RunOptionsMinimal = {
  returnOnDelegationComplete?: boolean
}

export type DelegationResult = {
  toolCallId: string
  toolName: string
  expertKey: string
  text: string
  stepNumber: number
  deltaUsage: Usage
}

/**
 * Handler for delegation operations.
 * Extracts delegation logic from run.ts for better separation of concerns.
 */
export class DelegationHandler {
  constructor(
    private runFn: (params: RunParamsInput, options?: RunOptionsMinimal) => Promise<Checkpoint>,
    private sumUsage: (a: Usage, b: Usage) => Usage,
  ) {}

  /**
   * Build state for continuing after a single delegation completes
   */
  buildSingleDelegationState(
    setting: RunSetting,
    checkpoint: Checkpoint,
    expert: Pick<Expert, "key" | "name" | "version">,
  ): DelegationStateResult {
    return buildDelegateToState(setting, checkpoint, expert)
  }

  /**
   * Build state for returning from a delegation to parent
   */
  buildDelegationReturnState(
    currentSetting: RunSetting,
    resultCheckpoint: Checkpoint,
    parentCheckpoint: Checkpoint,
  ): DelegationStateResult {
    return buildDelegationReturnState(currentSetting, resultCheckpoint, parentCheckpoint)
  }

  /**
   * Execute a single delegation
   */
  async executeDelegation(
    delegation: DelegationTarget,
    parentSetting: RunSetting,
    parentCheckpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    options?: RunOptionsMinimal,
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

    const resultCheckpoint = await this.runFn(
      { setting: delegateSetting, checkpoint: delegateCheckpoint },
      { ...options, returnOnDelegationComplete: true },
    )

    return this.extractDelegationResult(resultCheckpoint, toolCallId, toolName, expert.key)
  }

  /**
   * Execute multiple delegations in parallel and aggregate results
   */
  async executeMultipleDelegations(
    delegations: DelegationTarget[],
    parentSetting: RunSetting,
    parentCheckpoint: Checkpoint,
    parentExpert: Pick<Expert, "key" | "name" | "version">,
    options?: RunOptionsMinimal,
  ): Promise<{
    firstResult: DelegationResult
    restToolResults: ToolResult[]
    aggregatedUsage: Usage
    maxStepNumber: number
    remainingPendingToolCalls: Checkpoint["pendingToolCalls"]
  }> {
    const [firstDelegation, ...remainingDelegations] = delegations
    if (!firstDelegation) {
      throw new Error("No delegations found")
    }

    const allResults = await Promise.all(
      delegations.map((delegation) =>
        this.executeDelegation(delegation, parentSetting, parentCheckpoint, parentExpert, options),
      ),
    )

    const [firstResult, ...restResults] = allResults
    if (!firstResult) {
      throw new Error("No delegation results")
    }

    const aggregatedUsage = allResults.reduce(
      (acc, result) => this.sumUsage(acc, result.deltaUsage),
      parentCheckpoint.usage,
    )

    const maxStepNumber = Math.max(...allResults.map((r) => r.stepNumber))

    const restToolResults: ToolResult[] = restResults.map((result) => ({
      id: result.toolCallId,
      skillName: `delegate/${result.expertKey}`,
      toolName: result.toolName,
      result: [{ type: "textPart", id: createId(), text: result.text }],
    }))

    const processedToolCallIds = new Set(remainingDelegations.map((d) => d.toolCallId))
    const remainingPendingToolCalls = parentCheckpoint.pendingToolCalls?.filter(
      (tc) => !processedToolCallIds.has(tc.id) && tc.id !== firstDelegation.toolCallId,
    )

    return {
      firstResult,
      restToolResults,
      aggregatedUsage,
      maxStepNumber,
      remainingPendingToolCalls: remainingPendingToolCalls?.length
        ? remainingPendingToolCalls
        : undefined,
    }
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
