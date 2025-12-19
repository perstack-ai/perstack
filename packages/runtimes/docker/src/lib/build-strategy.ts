import * as path from "node:path"
import type { ExecResult, RunEvent, RuntimeEvent } from "@perstack/core"
import { createRuntimeEvent } from "@perstack/core"
import { parseBuildOutputLine } from "./output-parser.js"
import type { ProcessFactory } from "./process-factory.js"
import { StreamBuffer } from "./stream-buffer.js"

export interface BuildContext {
  buildDir: string
  jobId?: string
  runId?: string
  eventListener?: (event: RunEvent | RuntimeEvent) => void
}

export interface BuildStrategy {
  build(
    context: BuildContext,
    execCommand: (args: string[]) => Promise<ExecResult>,
    processFactory: ProcessFactory,
  ): Promise<void>
}

export class QuietBuildStrategy implements BuildStrategy {
  async build(
    context: BuildContext,
    execCommand: (args: string[]) => Promise<ExecResult>,
    _processFactory: ProcessFactory,
  ): Promise<void> {
    const composeFile = path.join(context.buildDir, "docker-compose.yml")
    const args = ["docker", "compose", "-f", composeFile, "build"]
    const result = await execCommand(args)
    if (result.exitCode !== 0) {
      throw new Error(`Docker build failed: ${result.stderr}`)
    }
  }
}

export class VerboseBuildStrategy implements BuildStrategy {
  async build(
    context: BuildContext,
    _execCommand: (args: string[]) => Promise<ExecResult>,
    processFactory: ProcessFactory,
  ): Promise<void> {
    const composeFile = path.join(context.buildDir, "docker-compose.yml")
    const args = ["compose", "-f", composeFile, "build", "--progress=plain"]
    const exitCode = await this.execCommandWithOutput(args, processFactory)
    if (exitCode !== 0) {
      throw new Error(`Docker build failed with exit code ${exitCode}`)
    }
  }

  private execCommandWithOutput(args: string[], processFactory: ProcessFactory): Promise<number> {
    return new Promise((resolve) => {
      const proc = processFactory("docker", args, {
        cwd: process.cwd(),
        stdio: ["pipe", process.stderr, process.stderr],
      })
      proc.on("close", (code) => resolve(code ?? 127))
      proc.on("error", () => resolve(127))
    })
  }
}

export class VerboseProgressBuildStrategy implements BuildStrategy {
  async build(
    context: BuildContext,
    _execCommand: (args: string[]) => Promise<ExecResult>,
    processFactory: ProcessFactory,
  ): Promise<void> {
    const { buildDir, jobId, runId, eventListener } = context
    if (!jobId || !runId || !eventListener) {
      throw new Error("VerboseProgressBuildStrategy requires jobId, runId, and eventListener")
    }

    const composeFile = path.join(buildDir, "docker-compose.yml")
    const args = ["compose", "-f", composeFile, "build", "--progress=plain"]

    eventListener(
      createRuntimeEvent("dockerBuildProgress", jobId, runId, {
        stage: "building",
        service: "runtime",
        message: "Starting Docker build...",
      }),
    )

    const exitCode = await this.execCommandWithBuildProgress(
      args,
      jobId,
      runId,
      eventListener,
      processFactory,
    )

    if (exitCode !== 0) {
      eventListener(
        createRuntimeEvent("dockerBuildProgress", jobId, runId, {
          stage: "error",
          service: "runtime",
          message: `Docker build failed with exit code ${exitCode}`,
        }),
      )
      throw new Error(`Docker build failed with exit code ${exitCode}`)
    }

    eventListener(
      createRuntimeEvent("dockerBuildProgress", jobId, runId, {
        stage: "complete",
        service: "runtime",
        message: "Docker build completed",
      }),
    )
  }

  private execCommandWithBuildProgress(
    args: string[],
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
    processFactory: ProcessFactory,
  ): Promise<number> {
    return new Promise((resolve) => {
      const proc = processFactory("docker", args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      })
      const buffer = new StreamBuffer()
      const processLine = (line: string) => {
        const parsed = parseBuildOutputLine(line)
        if (parsed) {
          eventListener(
            createRuntimeEvent("dockerBuildProgress", jobId, runId, {
              stage: parsed.stage,
              service: parsed.service,
              message: parsed.message,
            }),
          )
        }
      }
      proc.stdout?.on("data", (data: Buffer) => buffer.processChunk(data.toString(), processLine))
      proc.stderr?.on("data", (data: Buffer) => buffer.processChunk(data.toString(), processLine))
      proc.on("close", (code) => {
        buffer.flush(processLine)
        resolve(code ?? 127)
      })
      proc.on("error", () => resolve(127))
    })
  }
}

export function selectBuildStrategy(
  verbose: boolean | undefined,
  hasEventListener: boolean,
  hasJobAndRunId: boolean,
): BuildStrategy {
  if (verbose && hasEventListener && hasJobAndRunId) {
    return new VerboseProgressBuildStrategy()
  }
  if (verbose) {
    return new VerboseBuildStrategy()
  }
  return new QuietBuildStrategy()
}
