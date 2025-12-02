import pkg from "../package.json" with { type: "json" }

export * from "./model.js"
export * from "./runtime.js"
export * from "./runtime-state-machine.js"
export const runtimeVersion = pkg.version
