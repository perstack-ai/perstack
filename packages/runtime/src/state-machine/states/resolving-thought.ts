import type { RunEvent } from "@perstack/core"
import type { RunSnapshot } from "../machine.js"
import { resolvingToolResultLogic } from "./resolving-tool-result.js"

export async function resolvingThoughtLogic(context: RunSnapshot["context"]): Promise<RunEvent> {
  return resolvingToolResultLogic(context)
}
