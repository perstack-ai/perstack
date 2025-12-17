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

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly name = "claude-code"
  protected version = "unknown"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    try {
      const result = await this.execCommand(["claude", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Claude Code CLI is not installed.",
            helpUrl: "https://docs.anthropic.com/en/docs/claude-code",
          },
        }
      }
      this.version = result.stdout.trim() || "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Claude Code CLI is not installed.",
          helpUrl: "https://docs.anthropic.com/en/docs/claude-code",
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
      throw new Error("ClaudeCodeAdapter requires jobId and runId in setting")
    }
    const { jobId, runId } = setting
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const query = setting.input.text ?? ""
    const initEvent = createRuntimeInitEvent(
      jobId,
      runId,
      expert.name,
      "claude-code",
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
      metadata: { runtime: "claude-code" },
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
    const result = await this.executeClaudeCliStreaming(
      expert.instruction,
      query,
      setting.timeout ?? 60000,
      state,
      eventListener,
      storeCheckpoint,
    )
    if (result.exitCode !== 0) {
      throw new Error(
        `Claude Code CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
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

  protected async executeClaudeCliStreaming(
    systemPrompt: string,
    prompt: string,
    timeout: number,
    state: StreamingState,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"]
    if (systemPrompt) {
      args.push("--append-system-prompt", systemPrompt)
    }
    const proc = spawn("claude", args, {
      cwd: process.cwd(),
      env: getFilteredEnv({
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
      }),
      stdio: ["pipe", "pipe", "pipe"],
    })
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
      const message = parsed.message as {
        content?: Array<{
          type: string
          text?: string
          id?: string
          name?: string
          input?: Record<string, unknown>
        }>
      }
      if (message.content) {
        for (const content of message.content) {
          if (content.type === "text") {
            const text = content.text?.trim()
            if (text && text !== state.lastStreamingText) {
              state.lastStreamingText = text
              const event = createStreamingTextEvent(jobId, runId, text)
              state.events.push(event)
              eventListener?.(event)
            }
          } else if (content.type === "tool_use") {
            const toolCall: ToolCall = {
              id: content.id ?? createId(),
              skillName: "claude-code",
              toolName: content.name ?? "unknown",
              args: content.input ?? {},
            }
            state.pendingToolCalls.set(toolCall.id, toolCall)
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
          }
        }
      }
    } else if (parsed.type === "user" && parsed.message) {
      const message = parsed.message as {
        content?: Array<{
          type: string
          tool_use_id?: string
          content?: string
        }>
      }
      if (message.content) {
        for (const content of message.content) {
          if (content.type === "tool_result") {
            const toolCallId = content.tool_use_id ?? ""
            const resultContent = content.content ?? ""
            const pendingToolCall = state.pendingToolCalls.get(toolCallId)
            const toolName = pendingToolCall?.toolName ?? "unknown"
            state.pendingToolCalls.delete(toolCallId)
            const toolResultMessage: ToolMessage = {
              id: createId(),
              type: "toolMessage",
              contents: [
                {
                  type: "toolResultPart",
                  id: createId(),
                  toolCallId,
                  toolName,
                  contents: [{ type: "textPart", id: createId(), text: resultContent }],
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
              [
                {
                  id: toolCallId,
                  skillName: "claude-code",
                  toolName,
                  result: [{ type: "textPart", id: createId(), text: resultContent }],
                },
              ],
            )
            state.events.push(event)
            eventListener?.(event)
          }
        }
      }
    } else if (parsed.type === "content_block_delta" && parsed.delta) {
      const delta = parsed.delta as { type?: string; text?: string }
      const text = delta.text?.trim()
      if (delta.type === "text_delta" && text) {
        const event = createStreamingTextEvent(jobId, runId, text)
        state.events.push(event)
        eventListener?.(event)
      }
    }
  }
}
