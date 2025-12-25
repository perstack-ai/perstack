import type { PerstackEvent, RuntimeEvent } from "@perstack/core"
import { useCallback, useState } from "react"
import type { RuntimeState } from "../types/index.js"
import { createInitialRuntimeState } from "../types/index.js"

const STREAMING_EVENT_TYPES = new Set([
  "startReasoning",
  "streamReasoning",
  "completeReasoning",
  "startRunResult",
  "streamRunResult",
])

const RUNTIME_EVENT_TYPES = new Set([
  "initializeRuntime",
  "skillStarting",
  "skillConnected",
  "skillDisconnected",
  "dockerBuildProgress",
  "dockerContainerStatus",
  "proxyAccess",
  ...STREAMING_EVENT_TYPES,
])

const isRuntimeEvent = (event: PerstackEvent): event is RuntimeEvent =>
  "type" in event && RUNTIME_EVENT_TYPES.has(event.type)

export type RuntimeStateResult = {
  runtimeState: RuntimeState
  handleRuntimeEvent: (event: PerstackEvent) => boolean
  clearStreaming: () => void
  resetRuntimeState: () => void
}

/**
 * Hook for managing RuntimeState from RuntimeEvent stream.
 * Only the latest state matters - this is not accumulated like LogEntry.
 */
export function useRuntimeState(): RuntimeStateResult {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(createInitialRuntimeState)

  const handleRuntimeEvent = useCallback((event: PerstackEvent): boolean => {
    if (!isRuntimeEvent(event)) {
      return false
    }

    switch (event.type) {
      case "initializeRuntime": {
        const e = event as RuntimeEvent & { type: "initializeRuntime" }
        setRuntimeState((prev) => ({
          ...prev,
          query: e.query,
          expertName: e.expertName,
          model: e.model,
          runtime: e.runtime,
          runtimeVersion: e.runtimeVersion,
        }))
        return true
      }

      case "skillStarting": {
        const e = event as RuntimeEvent & { type: "skillStarting" }
        setRuntimeState((prev) => {
          const skills = new Map(prev.skills)
          skills.set(e.skillName, { name: e.skillName, status: "starting" })
          return { ...prev, skills }
        })
        return true
      }

      case "skillConnected": {
        const e = event as RuntimeEvent & { type: "skillConnected" }
        setRuntimeState((prev) => {
          const skills = new Map(prev.skills)
          skills.set(e.skillName, {
            name: e.skillName,
            status: "connected",
            serverInfo: e.serverInfo,
          })
          return { ...prev, skills }
        })
        return true
      }

      case "skillDisconnected": {
        const e = event as RuntimeEvent & { type: "skillDisconnected" }
        setRuntimeState((prev) => {
          const skills = new Map(prev.skills)
          skills.set(e.skillName, { name: e.skillName, status: "disconnected" })
          return { ...prev, skills }
        })
        return true
      }

      case "dockerBuildProgress": {
        const e = event as RuntimeEvent & { type: "dockerBuildProgress" }
        setRuntimeState((prev) => ({
          ...prev,
          dockerBuild: {
            stage: e.stage,
            service: e.service,
            message: e.message,
            progress: e.progress,
          },
        }))
        return true
      }

      case "dockerContainerStatus": {
        const e = event as RuntimeEvent & { type: "dockerContainerStatus" }
        setRuntimeState((prev) => {
          const dockerContainers = new Map(prev.dockerContainers)
          dockerContainers.set(e.service, {
            status: e.status,
            service: e.service,
            message: e.message,
          })
          return { ...prev, dockerContainers }
        })
        return true
      }

      case "proxyAccess": {
        const e = event as RuntimeEvent & { type: "proxyAccess" }
        setRuntimeState((prev) => ({
          ...prev,
          proxyAccess: {
            action: e.action,
            domain: e.domain,
            port: e.port,
            reason: e.reason,
          },
        }))
        return true
      }

      case "startReasoning": {
        setRuntimeState((prev) => ({
          ...prev,
          streaming: { ...prev.streaming, reasoning: "", isReasoningActive: true },
        }))
        return true
      }

      case "streamReasoning": {
        const e = event as RuntimeEvent & { type: "streamReasoning" }
        setRuntimeState((prev) => ({
          ...prev,
          streaming: {
            ...prev.streaming,
            reasoning: (prev.streaming.reasoning ?? "") + e.delta,
          },
        }))
        return true
      }

      case "completeReasoning": {
        setRuntimeState((prev) => ({
          ...prev,
          streaming: { ...prev.streaming, isReasoningActive: false },
        }))
        // Return false to allow event-to-log to also process this for reasoning attachment
        return false
      }

      case "startRunResult": {
        setRuntimeState((prev) => ({
          ...prev,
          streaming: {
            reasoning: undefined,
            isReasoningActive: false,
            runResult: "",
            isRunResultActive: true,
          },
        }))
        return true
      }

      case "streamRunResult": {
        const e = event as RuntimeEvent & { type: "streamRunResult" }
        setRuntimeState((prev) => ({
          ...prev,
          streaming: {
            ...prev.streaming,
            runResult: (prev.streaming.runResult ?? "") + e.delta,
          },
        }))
        return true
      }

      default:
        return false
    }
  }, [])

  const clearStreaming = useCallback(() => {
    setRuntimeState((prev) => ({
      ...prev,
      streaming: {},
    }))
  }, [])

  const resetRuntimeState = useCallback(() => {
    setRuntimeState(createInitialRuntimeState())
  }, [])

  return {
    runtimeState,
    handleRuntimeEvent,
    clearStreaming,
    resetRuntimeState,
  }
}
