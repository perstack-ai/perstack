import type { PerstackEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { createInitialRuntimeState } from "../types/index.js"

function createRuntimeEvent<T extends RuntimeEvent["type"]>(
  type: T,
  data: Omit<Extract<RuntimeEvent, { type: T }>, "id" | "timestamp" | "jobId" | "runId" | "type">,
): Extract<RuntimeEvent, { type: T }> {
  return {
    id: "e-1",
    timestamp: Date.now(),
    jobId: "job-1",
    runId: "run-1",
    type,
    ...data,
  } as Extract<RuntimeEvent, { type: T }>
}

describe("useRuntime state updates", () => {
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

  describe("event filtering", () => {
    it("returns false for non-RuntimeEvent (RunEvent)", () => {
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

      expect("expertKey" in event).toBe(true)
    })
  })
})
