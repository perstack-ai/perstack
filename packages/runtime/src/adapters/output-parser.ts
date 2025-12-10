import { createId } from "@paralleldrive/cuid2"
import type { Checkpoint, ExpertMessage, RunEvent, RuntimeEvent, RuntimeName } from "@perstack/core"
import { createEmptyUsage } from "../usage.js"

export type ParsedOutput = {
  events: (RunEvent | RuntimeEvent)[]
  finalOutput: string
}

export function parseExternalOutput(stdout: string, runtime: RuntimeName): ParsedOutput {
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
  return {
    events: [],
    finalOutput: stdout.trim(),
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
      }
    } catch {
      if (finalOutput) {
        finalOutput += "\n" + trimmed
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
    metadata: { runtime, externalExecution: true },
  }
}

export function createRuntimeInitEvent(
  jobId: string,
  runId: string,
  expertName: string,
  runtime: RuntimeName,
): RuntimeEvent {
  return {
    type: "initializeRuntime",
    id: createId(),
    timestamp: Date.now(),
    jobId,
    runId,
    runtimeVersion: `external:${runtime}`,
    expertName,
    experts: [],
    model: `${runtime}:default`,
    temperature: 0,
    maxRetries: 0,
    timeout: 0,
  }
}

export function createCompleteRunEvent(
  jobId: string,
  runId: string,
  expertKey: string,
  checkpoint: Checkpoint,
  output: string,
): RunEvent {
  return {
    type: "completeRun",
    id: createId(),
    expertKey,
    timestamp: Date.now(),
    jobId,
    runId,
    stepNumber: 1,
    checkpoint,
    step: {
      stepNumber: 1,
      newMessages: [],
      usage: createEmptyUsage(),
      startedAt: Date.now(),
    },
    text: output,
    usage: createEmptyUsage(),
  }
}
