import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import { run as perstackRun } from "../runtime.js"
import type {
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  RuntimeAdapter,
  RuntimeExpertConfig,
} from "./types.js"

export class PerstackAdapter implements RuntimeAdapter {
  readonly name = "perstack"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const events: (RunEvent | RuntimeEvent)[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      events.push(event)
      params.eventListener?.(event)
    }
    const checkpoint = await perstackRun(
      { setting: params.setting, checkpoint: params.checkpoint },
      { eventListener },
    )
    return { checkpoint, events }
  }
}
