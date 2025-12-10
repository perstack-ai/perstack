import { createId } from "@paralleldrive/cuid2"
import type { Checkpoint } from "../schemas/checkpoint.js"
import type { ExpertMessage, ToolMessage } from "../schemas/message.js"
import type { RunEvent, RuntimeEvent } from "../schemas/runtime.js"
import type { RuntimeName } from "../schemas/runtime-name.js"
import type { ToolCall } from "../schemas/tool-call.js"
import type { ToolResult } from "../schemas/tool-result.js"
import type { Usage } from "../schemas/usage.js"

export function createEmptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  }
}

export type CreateCheckpointParams = {
  jobId: string
  runId: string
  expertKey: string
  expert: { key: string; name: string; version: string }
  output: string
  runtime: RuntimeName
}

export function createNormalizedCheckpoint(params: CreateCheckpointParams): Checkpoint {
  const { jobId, runId, expert, output, runtime } = params
  const checkpointId = createId()
  const expertMessage: ExpertMessage = {
    id: createId(),
    type: "expertMessage",
    contents: [{ type: "textPart", id: createId(), text: output }],
  }
  return {
    id: checkpointId,
    jobId,
    runId,
    status: "completed",
    stepNumber: 1,
    messages: [expertMessage],
    expert: { key: expert.key, name: expert.name, version: expert.version },
    usage: createEmptyUsage(),
    metadata: { runtime },
  }
}

export function createRuntimeInitEvent(
  jobId: string,
  runId: string,
  expertName: string,
  runtime: RuntimeName,
  version: string,
  query?: string,
): RuntimeEvent {
  return {
    type: "initializeRuntime",
    id: createId(),
    timestamp: Date.now(),
    jobId,
    runId,
    runtimeVersion: version,
    runtime,
    expertName,
    experts: [],
    model: `${runtime}:default`,
    temperature: 0,
    maxRetries: 0,
    timeout: 0,
    query,
  }
}

export function createCompleteRunEvent(
  jobId: string,
  runId: string,
  expertKey: string,
  checkpoint: Checkpoint,
  output: string,
  startedAt?: number,
): RunEvent {
  const lastMessage = checkpoint.messages[checkpoint.messages.length - 1]
  return {
    type: "completeRun",
    id: createId(),
    expertKey,
    timestamp: Date.now(),
    jobId,
    runId,
    stepNumber: checkpoint.stepNumber,
    checkpoint,
    step: {
      stepNumber: checkpoint.stepNumber,
      newMessages: lastMessage ? [lastMessage] : [],
      usage: createEmptyUsage(),
      startedAt: startedAt ?? Date.now(),
    },
    text: output,
    usage: createEmptyUsage(),
  }
}

export function createStreamingTextEvent(jobId: string, runId: string, text: string): RuntimeEvent {
  return {
    type: "streamingText",
    id: createId(),
    timestamp: Date.now(),
    jobId,
    runId,
    text,
  }
}

export function createCallToolsEvent(
  jobId: string,
  runId: string,
  expertKey: string,
  stepNumber: number,
  toolCalls: ToolCall[],
  _checkpoint: Checkpoint,
): RunEvent {
  const expertMessage: ExpertMessage = {
    id: createId(),
    type: "expertMessage",
    contents: [],
  }
  return {
    type: "callTools",
    id: createId(),
    expertKey,
    timestamp: Date.now(),
    jobId,
    runId,
    stepNumber,
    newMessage: expertMessage,
    toolCalls,
    usage: createEmptyUsage(),
  }
}

export function createResolveToolResultsEvent(
  jobId: string,
  runId: string,
  expertKey: string,
  stepNumber: number,
  toolResults: ToolResult[],
): RunEvent {
  return {
    type: "resolveToolResults",
    id: createId(),
    expertKey,
    timestamp: Date.now(),
    jobId,
    runId,
    stepNumber,
    toolResults,
  }
}

export function createToolMessage(
  toolCallId: string,
  toolName: string,
  resultText: string,
): ToolMessage {
  return {
    id: createId(),
    type: "toolMessage",
    contents: [
      {
        type: "toolResultPart",
        id: createId(),
        toolCallId,
        toolName,
        contents: [{ type: "textPart", id: createId(), text: resultText }],
      },
    ],
  }
}
