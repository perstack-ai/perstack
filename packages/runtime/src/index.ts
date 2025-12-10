import { registerAdapter } from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import { PerstackAdapter } from "./adapters/index.js"

registerAdapter("perstack", () => new PerstackAdapter())

export type { MockAdapterOptions } from "./adapters/index.js"
export { MockAdapter, PerstackAdapter } from "./adapters/index.js"
export {
  defaultStoreCheckpoint,
  getCheckpointDir,
  getCheckpointPath,
  getCheckpointsByJobId,
  getEventContents,
  getEventsByRun,
} from "./default-store.js"
export * from "./job-store.js"
export * from "./model.js"
export { defaultGetRunDir as getRunDir, getAllRuns } from "./run-setting-store.js"
export * from "./runtime.js"
export * from "./runtime-state-machine.js"
export const runtimeVersion = pkg.version
