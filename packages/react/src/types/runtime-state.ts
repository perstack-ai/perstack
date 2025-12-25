/**
 * RuntimeState represents the current state of the runtime environment.
 * This is derived from RuntimeEvent and only the latest state matters.
 *
 * Unlike LogEntry (which accumulates), RuntimeState is replaced on each update.
 */

/** Skill connection state */
export type SkillState = {
  name: string
  status: "starting" | "connected" | "disconnected"
  serverInfo?: {
    name: string
    version: string
  }
}

/** Docker build progress state */
export type DockerBuildState = {
  stage: "pulling" | "building" | "complete" | "error"
  service: string
  message: string
  progress?: number
}

/** Docker container status state */
export type DockerContainerState = {
  status: "starting" | "running" | "healthy" | "unhealthy" | "stopped" | "error"
  service: string
  message?: string
}

/** Proxy access state (most recent) */
export type ProxyAccessState = {
  action: "allowed" | "blocked"
  domain: string
  port: number
  reason?: string
}

/** Streaming state for real-time display */
export type StreamingState = {
  /** Accumulated reasoning text during extended thinking */
  reasoning?: string
  /** Accumulated run result text during generation */
  runResult?: string
  /** Whether reasoning is currently streaming */
  isReasoningActive?: boolean
  /** Whether run result is currently streaming */
  isRunResultActive?: boolean
}

/**
 * RuntimeState captures the current state of the runtime environment.
 * All fields represent the latest state from RuntimeEvent.
 */
export type RuntimeState = {
  // From initializeRuntime
  /** Current query being processed */
  query?: string
  /** Current expert name */
  expertName?: string
  /** Model being used */
  model?: string
  /** Runtime type (e.g., "docker", "local") */
  runtime?: string
  /** Runtime version */
  runtimeVersion?: string

  // Skill states (keyed by skill name)
  skills: Map<string, SkillState>

  // Docker states
  /** Docker build progress (latest) */
  dockerBuild?: DockerBuildState
  /** Docker container states (keyed by service name) */
  dockerContainers: Map<string, DockerContainerState>

  // Proxy access (latest)
  proxyAccess?: ProxyAccessState

  // Streaming state
  streaming: StreamingState
}

/** Creates an empty initial runtime state */
export function createInitialRuntimeState(): RuntimeState {
  return {
    skills: new Map(),
    dockerContainers: new Map(),
    streaming: {},
  }
}
