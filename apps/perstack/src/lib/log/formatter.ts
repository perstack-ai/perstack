import type { Checkpoint, Job, RunEvent } from "@perstack/core"
import type { FormatterOptions, LogOutput, LogSummary } from "./types.js"

const ERROR_EVENT_TYPES = new Set(["stopRunByError", "retry"])
const TOOL_EVENT_TYPES = new Set(["callTools", "resolveToolResults", "callInteractiveTool"])
const DELEGATION_EVENT_TYPES = new Set(["callDelegate", "stopRunByDelegate"])

export function createSummary(events: RunEvent[]): LogSummary {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      errorCount: 0,
      toolCallCount: 0,
      delegationCount: 0,
    }
  }
  const stepNumbers = events.map((e) => e.stepNumber)
  return {
    totalEvents: events.length,
    errorCount: events.filter((e) => ERROR_EVENT_TYPES.has(e.type)).length,
    toolCallCount: events.filter((e) => TOOL_EVENT_TYPES.has(e.type)).length,
    delegationCount: events.filter((e) => DELEGATION_EVENT_TYPES.has(e.type)).length,
    stepRange: { min: Math.min(...stepNumbers), max: Math.max(...stepNumbers) },
  }
}

export function formatJson(output: LogOutput, options: FormatterOptions): string {
  const data: Record<string, unknown> = {
    job: output.job,
    events: output.events,
    summary: output.summary,
  }
  // Include optional fields when present
  if (output.checkpoint) {
    data.checkpoint = output.checkpoint
  }
  if (output.checkpoints && output.checkpoints.length > 0) {
    data.checkpoints = output.checkpoints
  }
  if (output.runs && output.runs.length > 0) {
    data.runs = output.runs
  }
  if (output.isLatestJob) {
    data.isLatestJob = true
  }
  if (output.storagePath) {
    data.storagePath = output.storagePath
  }
  if (output.totalEventsBeforeLimit !== undefined) {
    data.totalEventsBeforeLimit = output.totalEventsBeforeLimit
  }
  if (output.matchedAfterPagination !== undefined) {
    data.matchedAfterPagination = output.matchedAfterPagination
  }
  if (options.pretty) {
    return JSON.stringify(data, null, 2)
  }
  return JSON.stringify(data)
}

export function formatTerminal(output: LogOutput, options: FormatterOptions): string {
  const lines: string[] = []
  // Show context information
  if (output.isLatestJob) {
    lines.push("(showing latest job)")
    lines.push("")
  }
  if (output.storagePath) {
    lines.push(`Storage: ${output.storagePath}`)
    lines.push("")
  }
  if (output.job) {
    lines.push(...formatJobHeader(output.job))
    lines.push("")
  }
  if (output.checkpoint && options.messages) {
    lines.push(...formatCheckpointWithMessages(output.checkpoint))
    lines.push("")
  } else if (output.checkpoint) {
    lines.push(...formatCheckpointHeader(output.checkpoint))
    lines.push("")
  }
  if (options.summary && output.summary) {
    lines.push(...formatSummarySection(output.summary))
    lines.push("")
  }
  if (output.events.length > 0) {
    lines.push("Events:")
    lines.push("─".repeat(50))
    for (const event of output.events) {
      lines.push(...formatEvent(event, options.verbose))
    }
    lines.push("─".repeat(50))
    // Show pagination info if events were truncated
    // Use matchedAfterPagination to compare with totalBeforeLimit, not events.length
    // (events.length may include context events which could exceed matchedAfterPagination)
    if (
      output.totalEventsBeforeLimit !== undefined &&
      output.matchedAfterPagination !== undefined &&
      output.totalEventsBeforeLimit > output.matchedAfterPagination
    ) {
      const contextNote =
        output.events.length > output.matchedAfterPagination
          ? ` (+${output.events.length - output.matchedAfterPagination} context)`
          : ""
      lines.push(
        `(showing ${output.matchedAfterPagination} of ${output.totalEventsBeforeLimit} matched events${contextNote})`,
      )
      lines.push(`Use --take and --offset to paginate, or --take 0 for all`)
    }
  } else if (output.totalEventsBeforeLimit !== undefined && output.totalEventsBeforeLimit > 0) {
    lines.push(`(${output.totalEventsBeforeLimit} events available, use --offset to view)`)
  }
  return lines.join("\n")
}

function formatJobHeader(job: Job): string[] {
  const lines: string[] = []
  lines.push(`Job: ${job.id} (${job.status})`)
  lines.push(`Expert: ${job.coordinatorExpertKey}`)
  lines.push(`Started: ${formatTimestamp(job.startedAt)}`)
  lines.push(`Steps: ${job.totalSteps}`)
  if (job.finishedAt) {
    lines.push(`Finished: ${formatTimestamp(job.finishedAt)}`)
  }
  return lines
}

function formatCheckpointHeader(checkpoint: Checkpoint): string[] {
  const lines: string[] = []
  lines.push(`Checkpoint: ${checkpoint.id}`)
  lines.push(`Status: ${checkpoint.status}`)
  lines.push(`Step: ${checkpoint.stepNumber}`)
  lines.push(`Expert: ${checkpoint.expert.key}`)
  return lines
}

function formatCheckpointWithMessages(checkpoint: Checkpoint): string[] {
  const lines: string[] = []
  lines.push(...formatCheckpointHeader(checkpoint))
  lines.push("")
  lines.push("Messages:")
  for (const msg of checkpoint.messages) {
    const content = extractTextContent(msg.contents)
    const preview = content.length > 100 ? `${content.slice(0, 100)}...` : content
    lines.push(`  [${msg.type}] ${preview}`)
  }
  return lines
}

function formatSummarySection(summary: LogSummary): string[] {
  const lines: string[] = []
  lines.push("Summary:")
  lines.push(`  Total Events: ${summary.totalEvents}`)
  lines.push(`  Errors: ${summary.errorCount}`)
  lines.push(`  Tool Calls: ${summary.toolCallCount}`)
  lines.push(`  Delegations: ${summary.delegationCount}`)
  if (summary.stepRange) {
    lines.push(`  Step Range: ${summary.stepRange.min} - ${summary.stepRange.max}`)
  }
  return lines
}

function formatEvent(event: RunEvent, verbose: boolean): string[] {
  const lines: string[] = []
  const time = formatTime(event.timestamp)
  const header = `[Step ${event.stepNumber}] ${event.type}${" ".repeat(Math.max(0, 24 - event.type.length))}${time}`
  lines.push(header)
  if (event.type === "startRun" && "inputMessages" in event) {
    const startEvent = event as { inputMessages: Array<{ type: string; contents: unknown[] }> }
    const userMsg = startEvent.inputMessages.find((m) => m.type === "userMessage")
    if (userMsg) {
      const text = extractTextContent(userMsg.contents)
      const preview = text.length > 60 ? `${text.slice(0, 60)}...` : text
      lines.push(`  Query: "${preview}"`)
    }
  }
  if (event.type === "callTools" && "toolCalls" in event) {
    const toolEvent = event as {
      toolCalls: Array<{ toolName: string; skillName: string; args: Record<string, unknown> }>
    }
    if (verbose) {
      for (const tc of toolEvent.toolCalls) {
        lines.push(`  [${tc.skillName}] ${tc.toolName}`)
        lines.push(`    Args: ${JSON.stringify(tc.args)}`)
      }
    } else {
      const toolNames = toolEvent.toolCalls.map((tc) => tc.toolName).join(", ")
      lines.push(`  Tools: ${toolNames}`)
    }
  }
  if (event.type === "resolveToolResults" && "toolResults" in event) {
    const resultEvent = event as { toolResults: Array<{ toolName: string; result: unknown[] }> }
    for (const tr of resultEvent.toolResults) {
      const text = extractTextContent(tr.result)
      const isError = text.toLowerCase().startsWith("error")
      const symbol = isError ? "✗" : "✓"
      const preview = text.length > 40 ? `${text.slice(0, 40)}...` : text
      lines.push(`  ${symbol} ${tr.toolName}: ${preview}`)
    }
  }
  if (event.type === "stopRunByError" && "error" in event) {
    const errorEvent = event as { error: { name: string; message: string; isRetryable: boolean } }
    lines.push(`  Error: ${errorEvent.error.name}`)
    lines.push(`  Message: ${errorEvent.error.message}`)
    lines.push(`  Retryable: ${errorEvent.error.isRetryable}`)
  }
  if (event.type === "callDelegate" && "toolCalls" in event) {
    const delegateEvent = event as {
      toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>
    }
    for (const tc of delegateEvent.toolCalls) {
      const expertKey = tc.args.expertKey ?? tc.args.expert ?? "unknown"
      lines.push(`  Delegate to: ${expertKey}`)
    }
  }
  if (event.type === "completeRun" && "text" in event) {
    const completeEvent = event as { text: string }
    const preview =
      completeEvent.text.length > 80 ? `${completeEvent.text.slice(0, 80)}...` : completeEvent.text
    lines.push(`  Result: ${preview}`)
  }
  if (event.type === "retry" && "reason" in event) {
    const retryEvent = event as { reason: string }
    lines.push(`  Reason: ${retryEvent.reason}`)
  }
  lines.push("")
  return lines
}

function extractTextContent(contents: unknown[]): string {
  if (!Array.isArray(contents)) return ""
  for (const c of contents) {
    if (
      typeof c === "object" &&
      c !== null &&
      "type" in c &&
      c.type === "textPart" &&
      "text" in c
    ) {
      return String(c.text)
    }
  }
  return ""
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "")
}

function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toISOString().slice(11, 19)
}
