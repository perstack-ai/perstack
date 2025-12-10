import { spawn } from "node:child_process"
import { BaseExternalAdapter } from "./base-external-adapter.js"
import {
  createCompleteRunEvent,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  parseExternalOutput,
} from "./output-parser.js"
import type { AdapterRunParams, AdapterRunResult, PrerequisiteResult } from "./types.js"

export class ClaudeCodeAdapter extends BaseExternalAdapter {
  readonly name = "claude-code"

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
    const { setting, eventListener } = params
    const expert = setting.experts?.[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }
    const jobId = setting.jobId ?? "external-job"
    const runId = setting.runId ?? "external-run"
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const prompt = setting.input.text ?? ""
    const initEvent = createRuntimeInitEvent(jobId, runId, expert.name, "claude-code")
    eventListener?.(initEvent)
    const startedAt = Date.now()
    const result = await this.executeClaudeCli(expert.instruction, prompt, setting.timeout ?? 60000)
    if (result.exitCode !== 0) {
      throw new Error(
        `Claude Code CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
      )
    }
    const { events: parsedEvents, finalOutput } = parseExternalOutput(result.stdout, "claude-code")
    for (const event of parsedEvents) {
      eventListener?.(event)
    }
    const checkpoint = createNormalizedCheckpoint({
      jobId,
      runId,
      expertKey: setting.expertKey,
      expert: expertInfo,
      output: finalOutput,
      runtime: "claude-code",
    })
    const completeEvent = createCompleteRunEvent(
      jobId,
      runId,
      setting.expertKey,
      checkpoint,
      finalOutput,
      startedAt,
    )
    eventListener?.(completeEvent)
    return { checkpoint, events: [initEvent, ...parsedEvents, completeEvent] }
  }

  protected async executeClaudeCli(
    systemPrompt: string,
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const args = ["-p", prompt]
    if (systemPrompt) {
      args.push("--append-system-prompt", systemPrompt)
    }
    const proc = spawn("claude", args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    return this.executeWithTimeout(proc, timeout)
  }
}
