import { spawn } from "node:child_process"
import type { AdapterRunParams, AdapterRunResult, PrerequisiteResult } from "./types.js"
import { BaseExternalAdapter } from "./base-external-adapter.js"
import {
  createCompleteRunEvent,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  parseExternalOutput,
} from "./output-parser.js"

export class CursorAdapter extends BaseExternalAdapter {
  readonly name = "cursor"

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
    const { setting, eventListener } = params
    const expert = setting.experts?.[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }
    const jobId = setting.jobId ?? "external-job"
    const runId = setting.runId ?? "external-run"
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const prompt = this.buildPrompt(expert.instruction, setting.input.text)
    const initEvent = createRuntimeInitEvent(jobId, runId, expert.name, "cursor")
    eventListener?.(initEvent)
    const startedAt = Date.now()
    const result = await this.executeCursorAgent(prompt, setting.timeout ?? 60000)
    if (result.exitCode !== 0) {
      throw new Error(`Cursor CLI failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`)
    }
    const { events: parsedEvents, finalOutput } = parseExternalOutput(result.stdout, "cursor")
    for (const event of parsedEvents) {
      eventListener?.(event)
    }
    const checkpoint = createNormalizedCheckpoint({
      jobId,
      runId,
      expertKey: setting.expertKey,
      expert: expertInfo,
      output: finalOutput,
      runtime: "cursor",
    })
    const completeEvent = createCompleteRunEvent(jobId, runId, setting.expertKey, checkpoint, finalOutput, startedAt)
    eventListener?.(completeEvent)
    return { checkpoint, events: [initEvent, ...parsedEvents, completeEvent] }
  }

  private buildPrompt(instruction: string, query?: string): string {
    let prompt = instruction
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  private async executeCursorAgent(
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn("cursor-agent", ["-p", prompt, "--force"], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    return this.executeWithTimeout(proc, timeout)
  }
}
