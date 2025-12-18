import {
  type CheckpointState,
  extractCheckpointState,
  extractToolCalls,
  filterEventsByType,
  getEventSequence,
  type ParsedEvent,
} from "./event-parser.js"

export type AssertionResult = {
  passed: boolean
  message: string
  details?: unknown
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
    return { passed: true, message: `Tool call count matches: ${expectedCount}` }
  }
  const allCounts = callToolsEvents.map((e) => extractToolCalls(e).length)
  return {
    passed: false,
    message: `No ${eventType} event with ${expectedCount} tool calls found`,
    details: { foundCounts: allCounts },
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
  type Check = { key: string; passed: boolean; expected: unknown; actual: unknown }
  const checks: Check[] = []
  if (expectedState.status !== undefined) {
    checks.push({
      key: "status",
      passed: state.status === expectedState.status,
      expected: expectedState.status,
      actual: state.status,
    })
  }
  if (expectedState.pendingToolCalls !== undefined) {
    checks.push({
      key: "pendingToolCalls.length",
      passed: state.pendingToolCalls.length === expectedState.pendingToolCalls.length,
      expected: expectedState.pendingToolCalls.length,
      actual: state.pendingToolCalls.length,
    })
  }
  if (expectedState.partialToolResults !== undefined) {
    checks.push({
      key: "partialToolResults.length",
      passed: state.partialToolResults.length === expectedState.partialToolResults.length,
      expected: expectedState.partialToolResults.length,
      actual: state.partialToolResults.length,
    })
  }
  const allPassed = checks.every((c) => c.passed)
  return {
    passed: allPassed,
    message: allPassed
      ? `Checkpoint state matches for ${eventType}`
      : `Checkpoint state mismatch for ${eventType}`,
    details: allPassed
      ? undefined
      : { failedChecks: checks.filter((c) => !c.passed), actualState: state },
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

export function assertNoRetry(events: ParsedEvent[]): AssertionResult {
  const retryEvents = events.filter((e) => e.type === "retry")
  if (retryEvents.length > 0) {
    const reasons = retryEvents.map(
      (e) => (e as { reason?: string }).reason ?? "unknown",
    )
    return {
      passed: false,
      message: `Retry events detected: ${retryEvents.length}`,
      details: { retryCount: retryEvents.length, reasons },
    }
  }
  return { passed: true, message: "No retry events" }
}
