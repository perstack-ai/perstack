import type { ChildProcess, SpawnOptions } from "node:child_process"
import { spawn } from "node:child_process"

export type ProcessFactory = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess

export const defaultProcessFactory: ProcessFactory = (command, args, options) => {
  return spawn(command, args, options)
}
