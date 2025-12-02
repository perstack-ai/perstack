import type { Checkpoint, Expert, RunSetting } from "@perstack/core"
import { createEmptyUsage } from "./usage.js"

export type CreateInitialCheckpointParams = {
  runId: string
  expertKey: string
  expert: Pick<Expert, "name" | "version">
  contextWindow: number | undefined
}

export function createInitialCheckpoint(
  checkpointId: string,
  params: CreateInitialCheckpointParams,
): Checkpoint {
  return {
    id: checkpointId,
    runId: params.runId,
    expert: {
      key: params.expertKey,
      name: params.expert.name,
      version: params.expert.version,
    },
    stepNumber: 1,
    status: "init",
    messages: [],
    usage: createEmptyUsage(),
    contextWindow: params.contextWindow,
    contextWindowUsage: params.contextWindow ? 0.0 : undefined,
  }
}

export function createNextStepCheckpoint(checkpointId: string, checkpoint: Checkpoint): Checkpoint {
  return {
    ...checkpoint,
    id: checkpointId,
    stepNumber: checkpoint.stepNumber + 1,
  }
}

export type DelegationStateResult = {
  setting: RunSetting
  checkpoint: Checkpoint
}

export function buildDelegationReturnState(
  currentSetting: RunSetting,
  resultCheckpoint: Checkpoint,
  parentCheckpoint: Checkpoint,
): DelegationStateResult {
  const { messages, delegatedBy } = resultCheckpoint
  if (!delegatedBy) {
    throw new Error("delegatedBy is required for buildDelegationReturnState")
  }
  const delegateResultMessage = messages[messages.length - 1]
  if (!delegateResultMessage || delegateResultMessage.type !== "expertMessage") {
    throw new Error("Delegation error: delegation result message is incorrect")
  }
  const delegateText = delegateResultMessage.contents.find((content) => content.type === "textPart")
  if (!delegateText) {
    throw new Error("Delegation error: delegation result message does not contain a text")
  }
  const { expert, toolCallId, toolName } = delegatedBy
  return {
    setting: {
      ...currentSetting,
      expertKey: expert.key,
      input: {
        interactiveToolCallResult: {
          toolCallId,
          toolName,
          text: delegateText.text,
        },
      },
    },
    checkpoint: {
      ...parentCheckpoint,
      stepNumber: resultCheckpoint.stepNumber,
      usage: resultCheckpoint.usage,
    },
  }
}

export function buildDelegateToState(
  currentSetting: RunSetting,
  resultCheckpoint: Checkpoint,
  currentExpert: Pick<Expert, "key" | "name" | "version">,
): DelegationStateResult {
  const { delegateTo } = resultCheckpoint
  if (!delegateTo) {
    throw new Error("delegateTo is required for buildDelegateToState")
  }
  const { expert, toolCallId, toolName, query } = delegateTo
  return {
    setting: {
      ...currentSetting,
      expertKey: expert.key,
      input: {
        text: query,
      },
    },
    checkpoint: {
      ...resultCheckpoint,
      status: "init",
      messages: [],
      expert: {
        key: expert.key,
        name: expert.name,
        version: expert.version,
      },
      delegatedBy: {
        expert: {
          key: currentExpert.key,
          name: currentExpert.name,
          version: currentExpert.version,
        },
        toolCallId,
        toolName,
        checkpointId: resultCheckpoint.id,
      },
      usage: resultCheckpoint.usage,
    },
  }
}
