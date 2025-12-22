import { registerAdapter } from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import { PerstackAdapter } from "./perstack-adapter.js"

registerAdapter("local", () => new PerstackAdapter())

export { findLockfile, getLockfileExpertToolDefinitions, loadLockfile } from "./helpers/index.js"
export { getModel } from "./helpers/model.js"
export { PerstackAdapter } from "./perstack-adapter.js"
export { type RunOptions, run } from "./run.js"
export {
  type CollectedToolDefinition,
  type CollectToolDefinitionsOptions,
  collectToolDefinitionsForExpert,
} from "./skill-manager/index.js"
export { type RunActor, type RunSnapshot, runtimeStateMachine } from "./state-machine/index.js"
export const runtimeVersion = pkg.version
