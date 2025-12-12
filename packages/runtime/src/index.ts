import { registerAdapter } from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import { PerstackAdapter } from "./perstack-adapter.js"

registerAdapter("perstack", () => new PerstackAdapter())

export { getModel } from "./helpers/model.js"
export { PerstackAdapter } from "./perstack-adapter.js"
export { run } from "./run.js"
export { type RunActor, type RunSnapshot, runtimeStateMachine } from "./state-machine/index.js"
export {
  createInitialJob,
  defaultGetRunDir as getRunDir,
  defaultStoreCheckpoint,
  getAllJobs,
  getAllRuns,
  getCheckpointDir,
  getCheckpointPath,
  getCheckpointsByJobId,
  getEventContents,
  getEventsByRun,
  getJobDir,
  getJobsDir,
  retrieveJob,
  storeJob,
} from "@perstack/storage"
export const runtimeVersion = pkg.version
