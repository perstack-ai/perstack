import type { Checkpoint, RunParamsInput } from "@perstack/core"
import { type RunOptions, RunOrchestrator } from "./orchestration/index.js"

export type { RunOptions }

/**
 * Execute a run with the given parameters and options.
 * This is the main entry point for the runtime.
 */
export async function run(runInput: RunParamsInput, options?: RunOptions): Promise<Checkpoint> {
  const orchestrator = new RunOrchestrator(options, run)
  return orchestrator.execute(runInput)
}
