import { useCallback, useState } from "react"
import { STOP_EVENT_TYPES } from "../../constants.js"
import type { InitialRuntimeConfig, PerstackEvent, RuntimeInfo } from "../../types/index.js"

type UseRuntimeInfoOptions = {
  initialExpertName?: string
  initialConfig: InitialRuntimeConfig
}
export const useRuntimeInfo = (options: UseRuntimeInfoOptions) => {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo>({
    status: "initializing",
    runtimeVersion: options.initialConfig.runtimeVersion,
    expertName: options.initialExpertName,
    model: options.initialConfig.model,
    temperature: options.initialConfig.temperature,
    maxSteps: options.initialConfig.maxSteps,
    maxRetries: options.initialConfig.maxRetries,
    timeout: options.initialConfig.timeout,
    activeSkills: [],
    contextWindowUsage: options.initialConfig.contextWindowUsage,
  })
  const handleEvent = useCallback((event: PerstackEvent) => {
    if (event.type === "initializeRuntime") {
      setRuntimeInfo((prev) => ({
        runtimeVersion: event.runtimeVersion,
        expertName: event.expertName,
        model: event.model,
        temperature: event.temperature,
        maxSteps: event.maxSteps,
        maxRetries: event.maxRetries,
        timeout: event.timeout,
        currentStep: 1,
        status: "running",
        query: event.query,
        statusChangedAt: Date.now(),
        activeSkills: [],
        contextWindowUsage: prev.contextWindowUsage,
      }))
      return { initialized: true }
    }
    if (event.type === "skillConnected") {
      setRuntimeInfo((prev) => ({
        ...prev,
        activeSkills: [...prev.activeSkills, event.skillName],
      }))
      return null
    }
    if (event.type === "skillDisconnected") {
      setRuntimeInfo((prev) => ({
        ...prev,
        activeSkills: prev.activeSkills.filter((s) => s !== event.skillName),
      }))
      return null
    }
    if ("stepNumber" in event) {
      const isComplete = event.type === "completeRun"
      const isStopped = STOP_EVENT_TYPES.includes(event.type as (typeof STOP_EVENT_TYPES)[number])
      const checkpoint =
        "nextCheckpoint" in event
          ? event.nextCheckpoint
          : "checkpoint" in event
            ? event.checkpoint
            : undefined
      setRuntimeInfo((prev) => ({
        ...prev,
        currentStep: event.stepNumber,
        status: isComplete ? "completed" : isStopped ? "stopped" : "running",
        ...(isComplete || isStopped ? { statusChangedAt: Date.now() } : {}),
        ...(checkpoint?.contextWindowUsage !== undefined
          ? { contextWindowUsage: checkpoint.contextWindowUsage }
          : {}),
      }))
      if (isComplete) return { completed: true }
      if (isStopped) return { stopped: true }
    }
    return null
  }, [])
  const setExpertName = useCallback((expertName: string) => {
    setRuntimeInfo((prev) => ({ ...prev, expertName }))
  }, [])
  const setQuery = useCallback((query: string) => {
    setRuntimeInfo((prev) => ({ ...prev, query }))
  }, [])
  const setCurrentStep = useCallback((step: number) => {
    setRuntimeInfo((prev) => ({ ...prev, currentStep: step }))
  }, [])
  const setContextWindowUsage = useCallback((contextWindowUsage: number) => {
    setRuntimeInfo((prev) => ({ ...prev, contextWindowUsage }))
  }, [])
  return {
    runtimeInfo,
    handleEvent,
    setExpertName,
    setQuery,
    setCurrentStep,
    setContextWindowUsage,
  }
}
