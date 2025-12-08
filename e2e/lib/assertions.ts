import {
  type CheckpointState,
  extractCheckpointState,
  extractToolCalls,
  filterEventsByType,
  getEventSequence,
  type ParsedEvent,
  type ToolCallInfo,
} from "./event-parser.js"

export type AssertionResult = {
  passed: boolean
  message: string
  details?: unknown
}

export function assertEventSequence(
  events: ParsedEvent[],
  expectedSequence: string[],
): AssertionResult {
  const actual = getEventSequence(events)
  const passed = JSON.stringify(actual) === JSON.stringify(expectedSequence)
  return {
    passed,
    message: passed
      ? `Event sequence matches: ${expectedSequence.join(" → ")}`
      : `Event sequence mismatch`,
    details: passed ? undefined : { expected: expectedSequence, actual },
  }
}

export function assertEventSequenceContains(
  events: ParsedEvent[],
  expectedSubsequence: string[],
): AssertionResult {
  const actual = getEventSequence(events)
  let matchIndex = 0
  for (const eventType of actual) {
    if (eventType === expectedSubsequence[matchIndex]) {
      matchIndex++
      if (matchIndex === expectedSubsequence.length) break
    }
  }
  const passed = matchIndex === expectedSubsequence.length
  return {
    passed,
    message: passed
      ? `Event sequence contains: ${expectedSubsequence.join(" → ")}`
      : `Event sequence missing expected subsequence`,
    details: passed ? undefined : { expected: expectedSubsequence, actual },
  }
}

export function assertToolCallCount(
  events: ParsedEvent[],
  eventType: "callTools",
  expectedCount: number,
): AssertionResult {
  const callToolsEvents = filterEventsByType(events, eventType)
  if (callToolsEvents.length === 0) {
    return { passed: false, message: `No ${eventType} events found` }
  }
  const matchingEvent = callToolsEvents.find((e) => extractToolCalls(e).length === expectedCount)
  if (matchingEvent) {
    return {
      passed: true,
      message: `Tool call count matches: ${expectedCount}`,
    }
  }
  const allCounts = callToolsEvents.map((e) => extractToolCalls(e).length)
  return {
    passed: false,
    message: `No ${eventType} event with ${expectedCount} tool calls found`,
    details: { foundCounts: allCounts },
  }
}

export function assertToolCallTypes(
  events: ParsedEvent[],
  expectedTypes: { skillName: string; toolName: string }[],
): AssertionResult {
  const callToolsEvents = filterEventsByType(events, "callTools")
  if (callToolsEvents.length === 0) {
    return { passed: false, message: "No callTools events found" }
  }
  const firstEvent = callToolsEvents[0]
  const toolCalls = extractToolCalls(firstEvent)
  const actualTypes = toolCalls.map((tc) => ({
    skillName: tc.skillName,
    toolName: tc.toolName,
  }))
  const passed = JSON.stringify(actualTypes) === JSON.stringify(expectedTypes)
  return {
    passed,
    message: passed
      ? `Tool call types match`
      : `Tool call types mismatch`,
    details: passed ? undefined : { expected: expectedTypes, actual: actualTypes },
  }
}

export function assertCheckpointState(
  events: ParsedEvent[],
  eventType: string,
  expectedState: Partial<CheckpointState>,
): AssertionResult {
  const targetEvent = events.find((e) => e.type === eventType)
  if (!targetEvent) {
    return { passed: false, message: `Event ${eventType} not found` }
  }
  const state = extractCheckpointState(targetEvent)
  if (!state) {
    return { passed: false, message: `No checkpoint in ${eventType} event` }
  }
  const checks: { key: string; passed: boolean; expected: unknown; actual: unknown }[] = []
  if (expectedState.status !== undefined) {
    checks.push({
      key: "status",
      passed: state.status === expectedState.status,
      expected: expectedState.status,
      actual: state.status,
    })
  }
  if (expectedState.pendingToolCalls !== undefined) {
    const expectedCount = expectedState.pendingToolCalls.length
    const actualCount = state.pendingToolCalls.length
    checks.push({
      key: "pendingToolCalls.length",
      passed: actualCount === expectedCount,
      expected: expectedCount,
      actual: actualCount,
    })
  }
  if (expectedState.partialToolResults !== undefined) {
    const expectedCount = expectedState.partialToolResults.length
    const actualCount = state.partialToolResults.length
    checks.push({
      key: "partialToolResults.length",
      passed: actualCount === expectedCount,
      expected: expectedCount,
      actual: actualCount,
    })
  }
  const allPassed = checks.every((c) => c.passed)
  const failedChecks = checks.filter((c) => !c.passed)
  return {
    passed: allPassed,
    message: allPassed
      ? `Checkpoint state matches for ${eventType}`
      : `Checkpoint state mismatch for ${eventType}`,
    details: allPassed ? undefined : { failedChecks, actualState: state },
  }
}

export function assertPartialResultsContain(
  events: ParsedEvent[],
  eventType: string,
  expectedToolNames: string[],
): AssertionResult {
  const targetEvent = events.find((e) => e.type === eventType)
  if (!targetEvent) {
    return { passed: false, message: `Event ${eventType} not found` }
  }
  const state = extractCheckpointState(targetEvent)
  if (!state) {
    return { passed: false, message: `No checkpoint in ${eventType} event` }
  }
  const actualToolNames = state.partialToolResults.map((tr) => tr.toolName)
  const allFound = expectedToolNames.every((name) => actualToolNames.includes(name))
  return {
    passed: allFound,
    message: allFound
      ? `Partial results contain: ${expectedToolNames.join(", ")}`
      : `Missing partial results`,
    details: allFound ? undefined : { expected: expectedToolNames, actual: actualToolNames },
  }
}

