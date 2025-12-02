import type { RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { useCallback, useMemo, useState } from "react"
import { UI_CONSTANTS } from "../../constants.js"
import type { DisplayStep, PerstackEvent, ToolExecution } from "../../types/index.js"

type StepBuilder = {
  query?: string
  tools: Map<string, ToolExecution>
  completion?: string
}
const TOOL_RESULT_EVENT_TYPES = new Set([
  "resolveToolResult",
  "resolveThought",
  "resolvePdfFile",
  "resolveImageFile",
  "attemptCompletion",
])
const isToolCallEvent = (event: PerstackEvent): event is RunEvent & { toolCall: ToolCall } =>
  "type" in event &&
  (event.type === "callTool" ||
    event.type === "callInteractiveTool" ||
    event.type === "callDelegate") &&
  "toolCall" in event
const isToolResultEvent = (event: PerstackEvent): event is RunEvent & { toolResult: ToolResult } =>
  "type" in event && TOOL_RESULT_EVENT_TYPES.has(event.type) && "toolResult" in event
const checkIsSuccess = (result: Array<{ type: string; text?: string }>): boolean => {
  const textPart = result.find((r) => r.type === "textPart")
  if (!textPart || typeof textPart.text !== "string") return true
  const text = textPart.text.toLowerCase()
  return !text.startsWith("error") && !text.includes("failed")
}
const extractQuery = (event: Extract<RunEvent, { type: "startRun" }>): string | undefined => {
  const userMessage = event.inputMessages.find((m) => m.type === "userMessage")
  if (userMessage?.type !== "userMessage") return undefined
  return userMessage.contents.find((c) => c.type === "textPart")?.text
}
const buildSteps = (events: PerstackEvent[]): DisplayStep[] => {
  const stepMap = new Map<number, StepBuilder>()
  const getOrCreateStep = (stepNumber: number): StepBuilder => {
    const existing = stepMap.get(stepNumber)
    if (existing) return existing
    const builder: StepBuilder = { tools: new Map() }
    stepMap.set(stepNumber, builder)
    return builder
  }
  for (const event of events) {
    if (!("stepNumber" in event)) continue
    const stepNum = event.stepNumber
    const builder = getOrCreateStep(stepNum)
    if (event.type === "startRun") {
      builder.query = extractQuery(event)
    } else if (event.type === "completeRun") {
      builder.completion = event.text
    } else if (isToolCallEvent(event)) {
      const { toolCall } = event
      builder.tools.set(toolCall.id, {
        id: toolCall.id,
        toolName: toolCall.toolName,
        args: toolCall.args as Record<string, unknown>,
      })
    } else if (isToolResultEvent(event)) {
      const { toolResult } = event
      const existing = builder.tools.get(toolResult.id)
      if (existing && Array.isArray(toolResult.result)) {
        existing.result = toolResult.result
        existing.isSuccess = checkIsSuccess(toolResult.result)
      }
    }
  }
  return Array.from(stepMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stepNumber, builder]) => ({
      id: `step-${stepNumber}`,
      stepNumber,
      query: builder.query,
      tools: Array.from(builder.tools.values()),
      completion: builder.completion,
    }))
}
export const useStepStore = () => {
  const [events, setEvents] = useState<PerstackEvent[]>([])
  const addEvent = useCallback((event: PerstackEvent) => {
    setEvents((prev) => {
      const newEvents = [...prev, event]
      return newEvents.length > UI_CONSTANTS.MAX_EVENTS
        ? newEvents.slice(-UI_CONSTANTS.MAX_EVENTS)
        : newEvents
    })
  }, [])
  const setHistoricalEvents = useCallback((historicalEvents: PerstackEvent[]) => {
    setEvents(
      historicalEvents.length > UI_CONSTANTS.MAX_EVENTS
        ? historicalEvents.slice(-UI_CONSTANTS.MAX_EVENTS)
        : historicalEvents,
    )
  }, [])
  const steps = useMemo(() => buildSteps(events), [events])
  const completedSteps = useMemo(() => {
    if (steps.length === 0) return []
    const lastStep = steps.at(-1)
    if (lastStep?.completion) return steps
    return steps.slice(0, -1)
  }, [steps])
  const currentStep = useMemo(() => {
    if (steps.length === 0) return null
    const lastStep = steps.at(-1)
    if (lastStep?.completion) return null
    return lastStep ?? null
  }, [steps])
  return {
    steps,
    completedSteps,
    currentStep,
    eventCount: events.length,
    addEvent,
    setHistoricalEvents,
  }
}
