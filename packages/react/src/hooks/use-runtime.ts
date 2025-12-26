import type { PerstackEvent, RuntimeEvent } from "@perstack/core"
import { useCallback, useState } from "react"
import type { RuntimeState } from "../types/index.js"
import { createInitialRuntimeState } from "../types/index.js"

const RUNTIME_EVENT_TYPES = new Set([
  "initializeRuntime",
  "skillStarting",
  "skillConnected",
  "skillDisconnected",
  "skillStderr",
  "dockerBuildProgress",
  "dockerContainerStatus",
  "proxyAccess",
])

const isRuntimeEvent = (event: PerstackEvent): event is RuntimeEvent =>
  "type" in event && RUNTIME_EVENT_TYPES.has(event.type)

export type RuntimeResult = {
  runtimeState: RuntimeState
  handleRuntimeEvent: (event: PerstackEvent) => boolean
  resetRuntimeState: () => void
}

/**
 * Hook for managing RuntimeState from RuntimeEvent stream.
 * Only handles infrastructure-level events (skills, docker, proxy).
 * Streaming events are now handled by useRun.
 */
export function useRuntime(): RuntimeResult {
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

      default:
        return false
    }
  }, [])

  const resetRuntimeState = useCallback(() => {
    setRuntimeState(createInitialRuntimeState())
  }, [])

  return {
    runtimeState,
    handleRuntimeEvent,
    resetRuntimeState,
  }
}

