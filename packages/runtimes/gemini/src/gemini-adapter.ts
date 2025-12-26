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
  getFilteredEnv,
} from "@perstack/core"

type StreamingState = {
  checkpoint: Checkpoint
  events: (RunEvent | RuntimeEvent)[]
  pendingToolCalls: Map<string, ToolCall>
  finalOutput: string
  accumulatedText: string
  lastStreamingText: string
}

export class GeminiAdapter extends BaseAdapter {
  readonly name = "gemini"
  protected version = "unknown"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    try {
      const result = await this.execCommand(["gemini", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Gemini CLI is not installed.",
            helpUrl: "https://github.com/google-gemini/gemini-cli",
          },
        }
      }
      this.version = result.stdout.trim() || "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Gemini CLI is not installed.",
          helpUrl: "https://github.com/google-gemini/gemini-cli",
        },
      }
    }
    if (!process.env.GEMINI_API_KEY) {
      return {
        ok: false,
        error: {
          type: "auth-missing",
          message: "GEMINI_API_KEY environment variable is not set.",
          helpUrl: "https://github.com/google-gemini/gemini-cli#authentication",
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
      throw new Error("GeminiAdapter requires jobId and runId in setting")
    }
    const { jobId, runId } = setting
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const query = setting.input.text
    const prompt = this.buildPrompt(expert.instruction, query)
    const initEvent = createRuntimeInitEvent(
      jobId,
      runId,
      expert.name,
      "gemini",
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
      metadata: { runtime: "gemini" },
    }
    const startRunEvent = createStartRunEvent(jobId, runId, setting.expertKey, initialCheckpoint)
    eventListener?.(startRunEvent)
    const state: StreamingState = {
      checkpoint: initialCheckpoint,
      events: [initEvent, startRunEvent],
      pendingToolCalls: new Map(),
      finalOutput: "",
      accumulatedText: "",
      lastStreamingText: "",
    }
    const startedAt = Date.now()
    const result = await this.executeGeminiCliStreaming(
      prompt,
      setting.timeout ?? 60000,
      state,
      eventListener,
      storeCheckpoint,
    )
    if (result.exitCode !== 0) {
      throw new Error(
        `Gemini CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
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
    let prompt = `## Instructions\n${instruction}`
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  protected async executeGeminiCliStreaming(
    prompt: string,
    timeout: number,
    state: StreamingState,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Gemini CLI requires additional env vars for authentication and config
    const proc = spawn("gemini", ["-p", prompt, "--output-format", "stream-json"], {
      cwd: process.cwd(),
      env: getFilteredEnv({
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? "",
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
        USER: process.env.USER ?? "",
        LOGNAME: process.env.LOGNAME ?? "",
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
    if (parsed.type === "result" && parsed.status === "success") {
      if (typeof parsed.output === "string") {
        state.finalOutput = parsed.output
      }
    } else if (parsed.type === "message" && parsed.role === "assistant") {
      const content = (parsed.content as string | undefined)?.trim()
      if (content) {
        if (parsed.delta === true) {
          state.accumulatedText += content
        } else {
          state.accumulatedText = content
        }
        state.finalOutput = state.accumulatedText
        if (content !== state.lastStreamingText) {
          state.lastStreamingText = content
          // Note: streamingText event was removed - text is accumulated in state.finalOutput
        }
      }
    } else if (parsed.type === "tool_use") {
      state.accumulatedText = ""
      state.lastStreamingText = ""
      const toolCall: ToolCall = {
        id: (parsed.tool_id as string) ?? createId(),
        skillName: "gemini",
        toolName: (parsed.tool_name as string) ?? "unknown",
        args: (parsed.parameters as Record<string, unknown>) ?? {},
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
    } else if (parsed.type === "tool_result") {
      const toolId = (parsed.tool_id as string) ?? ""
      const output = (parsed.output as string) ?? ""
      const pendingToolCall = state.pendingToolCalls.get(toolId)
      const toolName = pendingToolCall?.toolName ?? "unknown"
      state.pendingToolCalls.delete(toolId)
      const toolResultMessage: ToolMessage = {
        id: createId(),
        type: "toolMessage",
        contents: [
          {
            type: "toolResultPart",
            id: createId(),
            toolCallId: toolId,
            toolName,
            contents: [{ type: "textPart", id: createId(), text: output }],
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
            id: toolId,
            skillName: "gemini",
            toolName,
            result: [{ type: "textPart", id: createId(), text: output }],
          },
        ],
      )
      state.events.push(event)
      eventListener?.(event)
    }
  }
}
