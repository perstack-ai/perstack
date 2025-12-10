import { registerAdapter } from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import { PerstackAdapter } from "./perstack-adapter.js"

registerAdapter("perstack", () => new PerstackAdapter())

export { PerstackAdapter } from "./perstack-adapter.js"
export { run } from "./run.js"
export { getModel } from "./helpers/model.js"
export {
  defaultStoreCheckpoint,
  getCheckpointDir,
  getCheckpointPath,
  getCheckpointsByJobId,
  getEventContents,
  getEventsByRun,
  defaultGetRunDir as getRunDir,
  getAllRuns,
} from "./storage/index.js"
export * from "./storage/job.js"
export { runtimeStateMachine, type RunActor, type RunSnapshot } from "./state-machine/index.js"
export const runtimeVersion = pkg.version
