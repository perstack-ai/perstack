import type { Expert, RuntimeName } from "@perstack/core"
import {
  createCompleteRunEvent,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
} from "./output-parser.js"
import type {
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  RuntimeAdapter,
  RuntimeExpertConfig,
} from "./types.js"

export type MockAdapterOptions = {
  name: RuntimeName
  shouldFail?: boolean
  failureMessage?: string
  mockOutput?: string
  delay?: number
}

export class MockAdapter implements RuntimeAdapter {
  readonly name: string
  private options: MockAdapterOptions

  constructor(options: MockAdapterOptions) {
    this.name = options.name
    this.options = options
  }

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    if (this.options.shouldFail) {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: this.options.failureMessage ?? "Mock failure",
        },
      }
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, eventListener } = params
    const expert = setting.experts?.[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }
    const startedAt = Date.now()
    if (this.options.delay) {
      await new Promise((r) => setTimeout(r, this.options.delay))
    }
    const jobId = setting.jobId ?? "mock-job"
    const runId = setting.runId ?? "mock-run"
    const output = this.options.mockOutput ?? `Mock output from ${this.name}`
    const expertInfo = { key: setting.expertKey, name: expert.name, version: expert.version }
    const initEvent = createRuntimeInitEvent(jobId, runId, expert.name, this.options.name, "mock")
    eventListener?.(initEvent)
    const checkpoint = createNormalizedCheckpoint({
      jobId,
      runId,
      expertKey: setting.expertKey,
      expert: expertInfo,
      output,
      runtime: this.options.name,
    })
    const completeEvent = createCompleteRunEvent(
      jobId,
      runId,
      setting.expertKey,
      checkpoint,
      output,
      startedAt,
    )
    eventListener?.(completeEvent)
    return { checkpoint, events: [initEvent, completeEvent] }
  }
}
