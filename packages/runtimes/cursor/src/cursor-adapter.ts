import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import { createId } from "@paralleldrive/cuid2"
import type {
  AdapterRunParams,
  AdapterRunResult,
  Checkpoint,
  ExpertMessage,
  PrerequisiteResult,
  RunEvent,
  RuntimeEvent,
  ToolCall,
  ToolMessage,
} from "@perstack/core"
import {
  BaseAdapter,
  createCallToolsEvent,
  createCompleteRunEvent,
  createEmptyUsage,
  createResolveToolResultsEvent,
  createRuntimeInitEvent,
  createStartRunEvent,
  createStreamingTextEvent,
  getFilteredEnv,
} from "@perstack/core"

type StreamingState = {
  checkpoint: Checkpoint
  events: (RunEvent | RuntimeEvent)[]
  pendingToolCalls: Map<string, ToolCall>
  finalOutput: string
  lastStreamingText: string
}

type CursorToolCall = {
  call_id: string
  tool_call: {
    [key: string]: {
      args: Record<string, unknown>
      result?: {
        success?: { content?: string }
        error?: string
      }
    }
  }
}

function cursorToolCallToPerstack(cursorToolCall: CursorToolCall): {
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

function cursorToolResultToPerstack(cursorToolCall: CursorToolCall): {
  id: string
  skillName: string
  toolName: string
  result: Array<{ type: "textPart"; id: string; text: string }>
} {
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

export class CursorAdapter extends BaseAdapter {
  readonly name = "cursor"
  protected version = "unknown"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    try {
      const result = await this.execCommand(["cursor-agent", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Cursor CLI (cursor-agent) is not installed.",
            helpUrl: "https://docs.cursor.com/context/rules",
          },
        }
      }
      this.version = result.stdout.trim() || "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Cursor CLI (cursor-agent) is not installed.",
          helpUrl: "https://docs.cursor.com/context/rules",
        },
      }
    }
    return { ok: true }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, eventListener, storeCheckpoint } = params
    const expert = setting.experts?.[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }
    if (!setting.jobId || !setting.runId) {
      throw new Error("CursorAdapter requires jobId and runId in setting")
    }
    const { jobId, runId } = setting
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const query = setting.input.text
    const prompt = this.buildPrompt(expert.instruction, query)
    const initEvent = createRuntimeInitEvent(
      jobId,
      runId,
      expert.name,
      "cursor",
      this.version,
      query,
    )
    eventListener?.(initEvent)
    const initialCheckpoint: Checkpoint = {
      id: createId(),
      jobId,
      runId,
      status: "init",
      stepNumber: 0,
      messages: [],
      expert: expertInfo,
      usage: createEmptyUsage(),
      metadata: { runtime: "cursor" },
      action: { type: "init" },
    }
    const startRunEvent = createStartRunEvent(jobId, runId, setting.expertKey, initialCheckpoint)
    eventListener?.(startRunEvent)
    const state: StreamingState = {
      checkpoint: initialCheckpoint,
      events: [initEvent, startRunEvent],
      pendingToolCalls: new Map(),
      finalOutput: "",
      lastStreamingText: "",
    }
    const startedAt = Date.now()
    const result = await this.executeCursorAgentStreaming(
      prompt,
      setting.timeout ?? 60000,
      state,
      eventListener,
      storeCheckpoint,
    )
    if (result.exitCode !== 0) {
      throw new Error(
        `Cursor CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
      )
    }
    const finalMessage: ExpertMessage = {
      id: createId(),
      type: "expertMessage",
      contents: [{ type: "textPart", id: createId(), text: state.finalOutput }],
    }
    const finalCheckpoint: Checkpoint = {
      ...state.checkpoint,
      status: "completed",
      stepNumber: state.checkpoint.stepNumber + 1,
      messages: [...state.checkpoint.messages, finalMessage],
    }
    await storeCheckpoint?.(finalCheckpoint)
    const completeEvent = createCompleteRunEvent(
      jobId,
      runId,
      setting.expertKey,
      finalCheckpoint,
      state.finalOutput,
      startedAt,
    )
    state.events.push(completeEvent)
    eventListener?.(completeEvent)
    return { checkpoint: finalCheckpoint, events: state.events }
  }

  protected buildPrompt(instruction: string, query?: string): string {
    let prompt = instruction
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  protected async executeCursorAgentStreaming(
    prompt: string,
    timeout: number,
    state: StreamingState,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn(
      "cursor-agent",
      ["--print", "--output-format", "stream-json", "--stream-partial-output", "--force", prompt],
      { cwd: process.cwd(), env: getFilteredEnv(), stdio: ["pipe", "pipe", "pipe"] },
    )
    proc.stdin.end()
    return this.executeWithStreaming(proc, timeout, state, eventListener, storeCheckpoint)
  }

  protected executeWithStreaming(
    proc: ChildProcess,
    timeout: number,
    state: StreamingState,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""
      let buffer = ""
      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`${this.name} timed out after ${timeout}ms`))
      }, timeout)
      proc.stdout?.on("data", (data) => {
        const chunk = data.toString()
        stdout += chunk
        buffer += chunk
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed)
            this.handleStreamEvent(parsed, state, eventListener, storeCheckpoint)
          } catch {
            // ignore non-JSON lines
          }
        }
      })
      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
      })
      proc.on("close", (code) => {
        clearTimeout(timer)
        resolve({ stdout, stderr, exitCode: code ?? 127 })
      })
      proc.on("error", (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  protected handleStreamEvent(
    parsed: Record<string, unknown>,
    state: StreamingState,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>,
  ): void {
    const { checkpoint } = state
    const jobId = checkpoint.jobId
    const runId = checkpoint.runId
    const expertKey = checkpoint.expert.key
    if (parsed.type === "result" && typeof parsed.result === "string") {
      state.finalOutput = parsed.result
    } else if (parsed.type === "assistant" && parsed.message) {
      const message = parsed.message as { content?: Array<{ type: string; text?: string }> }
      if (message.content) {
        for (const content of message.content) {
          const text = content.text?.trim()
          if (content.type === "text" && text && text !== state.lastStreamingText) {
            state.lastStreamingText = text
            const event = createStreamingTextEvent(jobId, runId, text)
            state.events.push(event)
            eventListener?.(event)
          }
        }
      }
    } else if (parsed.type === "tool_call" && parsed.subtype === "started") {
      const cursorToolCall = parsed as unknown as CursorToolCall
      const { toolCall } = cursorToolCallToPerstack(cursorToolCall)
      state.pendingToolCalls.set(cursorToolCall.call_id, toolCall)
      const event = createCallToolsEvent(
        jobId,
        runId,
        expertKey,
        checkpoint.stepNumber,
        [toolCall],
        checkpoint,
      )
      state.events.push(event)
      eventListener?.(event)
    } else if (parsed.type === "tool_call" && parsed.subtype === "completed") {
      const cursorToolCall = parsed as unknown as CursorToolCall
      const toolResult = cursorToolResultToPerstack(cursorToolCall)
      state.pendingToolCalls.delete(cursorToolCall.call_id)
      const toolResultMessage: ToolMessage = {
        id: createId(),
        type: "toolMessage",
        contents: [
          {
            type: "toolResultPart",
            id: createId(),
            toolCallId: toolResult.id,
            toolName: toolResult.toolName,
            contents: toolResult.result.filter(
              (part): part is { type: "textPart"; id: string; text: string } =>
                part.type === "textPart",
            ),
          },
        ],
      }
      state.checkpoint = {
        ...state.checkpoint,
        stepNumber: state.checkpoint.stepNumber + 1,
        messages: [...state.checkpoint.messages, toolResultMessage],
      }
      storeCheckpoint?.(state.checkpoint)
      const event = createResolveToolResultsEvent(
        jobId,
        runId,
        expertKey,
        state.checkpoint.stepNumber,
        [toolResult],
      )
      state.events.push(event)
      eventListener?.(event)
    }
  }
}
