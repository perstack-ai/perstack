import { spawn } from "node:child_process"
import type { AdapterRunParams, AdapterRunResult, PrerequisiteResult } from "./types.js"
import { BaseExternalAdapter } from "./base-external-adapter.js"
import {
  createCompleteRunEvent,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  parseExternalOutput,
} from "./output-parser.js"

export class GeminiAdapter extends BaseExternalAdapter {
  readonly name = "gemini"

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
    const { setting, eventListener } = params
    const expert = setting.experts?.[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }
    const jobId = setting.jobId ?? "external-job"
    const runId = setting.runId ?? "external-run"
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const prompt = this.buildPrompt(expert.instruction, setting.input.text)
    const initEvent = createRuntimeInitEvent(jobId, runId, expert.name, "gemini")
    eventListener?.(initEvent)
    const startedAt = Date.now()
    const result = await this.executeGeminiCli(prompt, setting.timeout ?? 60000)
    if (result.exitCode !== 0) {
      throw new Error(`Gemini CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`)
    }
    const { events: parsedEvents, finalOutput } = parseExternalOutput(result.stdout, "gemini")
    for (const event of parsedEvents) {
      eventListener?.(event)
    }
    const checkpoint = createNormalizedCheckpoint({
      jobId,
      runId,
      expertKey: setting.expertKey,
      expert: expertInfo,
      output: finalOutput,
      runtime: "gemini",
    })
    const completeEvent = createCompleteRunEvent(jobId, runId, setting.expertKey, checkpoint, finalOutput, startedAt)
    eventListener?.(completeEvent)
    return { checkpoint, events: [initEvent, ...parsedEvents, completeEvent] }
  }

  private buildPrompt(instruction: string, query?: string): string {
    let prompt = `## Instructions\n${instruction}`
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  private async executeGeminiCli(
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn("gemini", ["-p", prompt], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    return this.executeWithTimeout(proc, timeout)
  }
}
