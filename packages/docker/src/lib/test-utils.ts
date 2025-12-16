import type { ChildProcess, SpawnOptions } from "node:child_process"
import { EventEmitter } from "node:events"
import type { ExecResult, RunEvent, RuntimeEvent } from "@perstack/core"
import { vi } from "vitest"
import { DockerAdapter } from "../docker-adapter.js"

export type MockProcess = {
  stdout: EventEmitter
  stderr: EventEmitter
  stdin: { end: () => void }
  kill: ReturnType<typeof vi.fn>
  on: (event: string, listener: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => boolean
}

export function createMockProcess(): MockProcess {
  const emitter = new EventEmitter()
  return {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: { end: vi.fn() },
    kill: vi.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }
}

export function createEventCollector() {
  const events: Array<RunEvent | RuntimeEvent> = []
  const listener = (event: RunEvent | RuntimeEvent) => events.push(event)
  return { events, listener }
}

export function findContainerStatusEvent(
  events: Array<RunEvent | RuntimeEvent>,
  status: string,
  service: string,
): (RunEvent | RuntimeEvent) | undefined {
  return events.find(
    (e) =>
      "type" in e &&
      e.type === "dockerContainerStatus" &&
      "status" in e &&
      e.status === status &&
      "service" in e &&
      e.service === service,
  )
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class TestableDockerAdapter extends DockerAdapter {
  public mockExecCommand: ((args: string[]) => Promise<ExecResult>) | null = null
  public mockExecCommandWithOutput: ((args: string[]) => Promise<number>) | null = null
  public mockCreateProcess: (() => MockProcess) | null = null
  public capturedBuildArgs: string[] = []

  protected override async execCommand(args: string[]): Promise<ExecResult> {
    if (this.mockExecCommand) {
      return this.mockExecCommand(args)
    }
    return super.execCommand(args)
  }

  protected override execCommandWithOutput(args: string[]): Promise<number> {
    this.capturedBuildArgs = args
    if (this.mockExecCommandWithOutput) {
      return this.mockExecCommandWithOutput(args)
    }
    return super.execCommandWithOutput(args)
  }

  protected override createProcess(
    command: string,
    args: string[],
    options: SpawnOptions,
  ): ChildProcess {
    if (this.mockCreateProcess) {
      return this.mockCreateProcess() as unknown as ChildProcess
    }
    return super.createProcess(command, args, options)
  }

  public testResolveWorkspacePath(workspace?: string): string | undefined {
    return this.resolveWorkspacePath(workspace)
  }

  public async testPrepareBuildContext(
    config: Parameters<DockerAdapter["prepareBuildContext"]>[0],
    expertKey: string,
    workspace?: string,
  ): Promise<string> {
    return this.prepareBuildContext(config, expertKey, workspace)
  }

  public async testBuildImages(buildDir: string, verbose?: boolean): Promise<void> {
    return this.buildImages(buildDir, verbose)
  }

  public testExecCommandWithOutput(args: string[]): Promise<number> {
    return super.execCommandWithOutput(args)
  }

  public testExecCommandWithBuildProgress(
    args: string[],
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<number> {
    return this.execCommandWithBuildProgress(args, jobId, runId, eventListener)
  }

  public testStartProxyLogStream(
    composeFile: string,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): ChildProcess {
    return this.startProxyLogStream(composeFile, jobId, runId, eventListener)
  }

  public async testRunContainer(
    buildDir: string,
    cliArgs: string[],
    envVars: Record<string, string>,
    timeout: number,
    verbose: boolean | undefined,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.runContainer(
      buildDir,
      cliArgs,
      envVars,
      timeout,
      verbose,
      jobId,
      runId,
      eventListener,
    )
  }
}

export function setupMockProcess(adapter: TestableDockerAdapter) {
  const mockProc = createMockProcess()
  adapter.mockCreateProcess = () => mockProc
  return mockProc
}

export const minimalExpertConfig = {
  model: "test-model",
  provider: { providerName: "anthropic" as const },
  experts: {
    "test-expert": {
      key: "test-expert",
      name: "Test Expert",
      version: "1.0.0",
      description: "Test expert",
      instruction: "You are a test expert",
      skills: {},
      delegates: [],
      tags: [],
    },
  },
}
