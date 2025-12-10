import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  ExpertMessage,
  RunEvent,
  RuntimeEvent,
  RuntimeName,
  ToolCall,
  ToolResult,
} from "@perstack/core"
import { createEmptyUsage } from "../usage.js"

export type ParsedOutput = {
  events: (RunEvent | RuntimeEvent)[]
  finalOutput: string
}

export function parseOutput(stdout: string, runtime: RuntimeName): ParsedOutput {
  switch (runtime) {
    case "cursor":
      return parseCursorOutput(stdout)
    case "claude-code":
      return parseClaudeCodeOutput(stdout)
    case "gemini":
      return parseGeminiOutput(stdout)
    default:
      return { events: [], finalOutput: stdout }
  }
}

function parseCursorOutput(stdout: string): ParsedOutput {
  const lines = stdout.split("\n")
  let finalOutput = ""
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.type === "result" && parsed.result) {
        finalOutput = parsed.result
      } else if (parsed.content || parsed.text) {
        const content = parsed.content || parsed.text
        finalOutput = finalOutput ? `${finalOutput}\n${content}` : content
      }
    } catch {
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) continue
      finalOutput = finalOutput ? `${finalOutput}\n${trimmed}` : trimmed
    }
  }
  return {
    events: [],
    finalOutput: finalOutput.trim() || stdout.trim(),
  }
}

function parseClaudeCodeOutput(stdout: string): ParsedOutput {
  const lines = stdout.split("\n")
  let finalOutput = ""
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.type === "result" || parsed.type === "output") {
        finalOutput = parsed.content || parsed.text || ""
      } else if (parsed.content || parsed.text) {
        const content = parsed.content || parsed.text
        if (finalOutput) {
          finalOutput += `\n${content}`
        } else {
          finalOutput = content
        }
      }
    } catch {
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) continue
      if (finalOutput) {
        finalOutput += `\n${trimmed}`
      } else {
        finalOutput = trimmed
      }
    }
  }
  return {
    events: [],
    finalOutput: finalOutput.trim() || stdout.trim(),
  }
}

function parseGeminiOutput(stdout: string): ParsedOutput {
  return {
    events: [],
    finalOutput: stdout.trim(),
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

export type CursorToolCall = {
  call_id: string
  tool_call: {
    [key: string]: {
      args: Record<string, unknown>
      result?: {
        success?: {
          content?: string
        }
        error?: string
      }
    }
  }
}

export function cursorToolCallToPerstack(cursorToolCall: CursorToolCall): {
  toolCall: ToolCall
  toolName: string
} {
  const toolKey = Object.keys(cursorToolCall.tool_call)[0]
  const toolData = cursorToolCall.tool_call[toolKey]
  const toolName = toolKey.replace("ToolCall", "")
  return {
    toolCall: {
      id: cursorToolCall.call_id,
      skillName: "cursor",
      toolName,
      args: toolData.args,
    },
    toolName,
  }
}

export function cursorToolResultToPerstack(cursorToolCall: CursorToolCall): ToolResult {
  const toolKey = Object.keys(cursorToolCall.tool_call)[0]
  const toolData = cursorToolCall.tool_call[toolKey]
  const toolName = toolKey.replace("ToolCall", "")
  const content = toolData.result?.success?.content ?? toolData.result?.error ?? ""
  return {
    id: cursorToolCall.call_id,
    skillName: "cursor",
    toolName,
    result: [{ type: "textPart", id: createId(), text: content }],
  }
}
