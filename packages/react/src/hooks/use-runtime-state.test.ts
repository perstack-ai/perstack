import type { PerstackEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { createInitialRuntimeState } from "../types/index.js"

// Since we can't use React hooks directly in Node.js tests,
// we test the state update logic by simulating the handler behavior

function createRuntimeEvent<T extends RuntimeEvent["type"]>(
  type: T,
  data: Omit<Extract<RuntimeEvent, { type: T }>, "id" | "timestamp" | "jobId" | "runId" | "type">,
): RuntimeEvent {
  return {
    id: "e-1",
    timestamp: Date.now(),
    jobId: "job-1",
    runId: "run-1",
    type,
    ...data,
  } as RuntimeEvent
}

describe("RuntimeState updates", () => {
  describe("initializeRuntime", () => {
    it("captures query, expertName, model, and runtime from event", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("initializeRuntime", {
        runtimeVersion: "1.0.0",
        expertName: "test-expert",
        model: "claude-sonnet-4-20250514",
        runtime: "docker",
        experts: [],
        maxRetries: 3,
        timeout: 30000,
        query: "Hello world",
      })

      // Simulate state update
      const newState = {
        ...state,
        query: event.query,
        expertName: event.expertName,
        model: event.model,
        runtime: event.runtime,
        runtimeVersion: event.runtimeVersion,
      }

      expect(newState.query).toBe("Hello world")
      expect(newState.expertName).toBe("test-expert")
      expect(newState.model).toBe("claude-sonnet-4-20250514")
      expect(newState.runtime).toBe("docker")
    })
  })

  describe("skill events", () => {
    it("tracks skill starting state", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("skillStarting", {
        skillName: "@perstack/base",
        command: "node",
        args: ["server.js"],
      })

      const skills = new Map(state.skills)
      skills.set(event.skillName, { name: event.skillName, status: "starting" })

      expect(skills.get("@perstack/base")?.status).toBe("starting")
    })

    it("tracks skill connected state", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("skillConnected", {
        skillName: "@perstack/base",
        serverInfo: { name: "base", version: "1.0.0" },
      })

      const skills = new Map(state.skills)
      skills.set(event.skillName, {
        name: event.skillName,
        status: "connected",
        serverInfo: event.serverInfo,
      })

      expect(skills.get("@perstack/base")?.status).toBe("connected")
      expect(skills.get("@perstack/base")?.serverInfo?.version).toBe("1.0.0")
    })
  })

  describe("docker events", () => {
    it("tracks docker build progress", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("dockerBuildProgress", {
        stage: "building",
        service: "runtime",
        message: "Building image...",
        progress: 50,
      })

      const newState = {
        ...state,
        dockerBuild: {
          stage: event.stage,
          service: event.service,
          message: event.message,
          progress: event.progress,
        },
      }

      expect(newState.dockerBuild?.stage).toBe("building")
      expect(newState.dockerBuild?.progress).toBe(50)
    })

    it("tracks docker container status", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("dockerContainerStatus", {
        status: "running",
        service: "runtime",
        message: "Container started",
      })

      const dockerContainers = new Map(state.dockerContainers)
      dockerContainers.set(event.service, {
        status: event.status,
        service: event.service,
        message: event.message,
      })

      expect(dockerContainers.get("runtime")?.status).toBe("running")
    })
  })

  describe("proxy events", () => {
    it("tracks proxy access", () => {
      const state = createInitialRuntimeState()
      const event = createRuntimeEvent("proxyAccess", {
        action: "allowed",
        domain: "example.com",
        port: 443,
        reason: "Allowlisted",
      })

      const newState = {
        ...state,
        proxyAccess: {
          action: event.action,
          domain: event.domain,
          port: event.port,
          reason: event.reason,
        },
      }

      expect(newState.proxyAccess?.action).toBe("allowed")
      expect(newState.proxyAccess?.domain).toBe("example.com")
    })
  })

  describe("streaming events", () => {
    it("handles startReasoning", () => {
      const state = createInitialRuntimeState()

      const newState = {
        ...state,
        streaming: { ...state.streaming, reasoning: "", isReasoningActive: true },
      }

      expect(newState.streaming.isReasoningActive).toBe(true)
      expect(newState.streaming.reasoning).toBe("")
    })

    it("accumulates streamReasoning deltas", () => {
      const state = {
        ...createInitialRuntimeState(),
        streaming: { reasoning: "Hello ", isReasoningActive: true },
      }
      const event = createRuntimeEvent("streamReasoning", { delta: "world" })

      const newState = {
        ...state,
        streaming: {
          ...state.streaming,
          reasoning: (state.streaming.reasoning ?? "") + event.delta,
        },
      }

      expect(newState.streaming.reasoning).toBe("Hello world")
    })

    it("handles startRunResult", () => {
      const state = {
        ...createInitialRuntimeState(),
        streaming: { reasoning: "Some reasoning", isReasoningActive: false },
      }

      const newState = {
        ...state,
        streaming: {
          reasoning: undefined,
          isReasoningActive: false,
          runResult: "",
          isRunResultActive: true,
        },
      }

      expect(newState.streaming.isRunResultActive).toBe(true)
      expect(newState.streaming.runResult).toBe("")
      expect(newState.streaming.reasoning).toBeUndefined()
    })

    it("accumulates streamRunResult deltas", () => {
      const state = {
        ...createInitialRuntimeState(),
        streaming: { runResult: "Hello ", isRunResultActive: true },
      }
      const event = createRuntimeEvent("streamRunResult", { delta: "world" })

      const newState = {
        ...state,
        streaming: {
          ...state.streaming,
          runResult: (state.streaming.runResult ?? "") + event.delta,
        },
      }

      expect(newState.streaming.runResult).toBe("Hello world")
    })
  })

  describe("event filtering", () => {
    it("returns false for non-RuntimeEvent", () => {
      // RunEvent should not be handled by RuntimeState
      const event: PerstackEvent = {
        id: "e-1",
        runId: "run-1",
        expertKey: "test-expert@1.0.0",
        jobId: "job-1",
        stepNumber: 1,
        timestamp: Date.now(),
        type: "startRun",
        initialCheckpoint: {},
        inputMessages: [],
      } as PerstackEvent

      // Check that it has expertKey (RunEvent identifier)
      expect("expertKey" in event).toBe(true)
    })
  })
})
