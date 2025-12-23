import type { RunEvent } from "@perstack/core"
import type { FilterCondition, FilterOptions, StepFilter } from "./types.js"

const ERROR_EVENT_TYPES = new Set(["stopRunByError", "retry"])
const TOOL_EVENT_TYPES = new Set(["callTools", "resolveToolResults", "callInteractiveTool"])
const DELEGATION_EVENT_TYPES = new Set(["callDelegate", "stopRunByDelegate"])

export function parseStepFilter(step: string): StepFilter {
  const trimmed = step.trim()
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const min = Number(rangeMatch[1])
    const max = Number(rangeMatch[2])
    if (min > max) {
      throw new Error(`Invalid step range: ${step} (min ${min} > max ${max})`)
    }
    return { type: "range", min, max }
  }
  const gteMatch = trimmed.match(/^>=(\d+)$/)
  if (gteMatch) {
    return { type: "gte", value: Number(gteMatch[1]) }
  }
  const gtMatch = trimmed.match(/^>(\d+)$/)
  if (gtMatch) {
    return { type: "gt", value: Number(gtMatch[1]) }
  }
  const lteMatch = trimmed.match(/^<=(\d+)$/)
  if (lteMatch) {
    return { type: "lte", value: Number(lteMatch[1]) }
  }
  const ltMatch = trimmed.match(/^<(\d+)$/)
  if (ltMatch) {
    return { type: "lt", value: Number(ltMatch[1]) }
  }
  const exactMatch = trimmed.match(/^(\d+)$/)
  if (exactMatch) {
    return { type: "exact", value: Number(exactMatch[1]) }
  }
  throw new Error(`Invalid step filter: ${step}`)
}

export function parseFilterExpression(expression: string): FilterCondition {
  const trimmed = expression.trim()
  const operatorMatch = trimmed.match(/^\.([a-zA-Z_][\w.[\]]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (!operatorMatch) {
    throw new Error(`Invalid filter expression: ${expression}`)
  }
  const [, fieldPath, operator, rawValue] = operatorMatch
  const trimmedValue = rawValue.trim()
  if (trimmedValue === "") {
    throw new Error(`Missing value in filter expression: ${expression}`)
  }
  const field = parseFieldPath(fieldPath)
  const value = parseValue(trimmedValue)
  return { field, operator: operator as FilterCondition["operator"], value }
}

function parseFieldPath(path: string): string[] {
  const parts: string[] = []
  let current = ""
  let i = 0
  while (i < path.length) {
    if (path[i] === ".") {
      if (current) {
        parts.push(current)
        current = ""
      }
      i++
    } else if (path[i] === "[" && path[i + 1] === "]") {
      if (current) {
        parts.push(current)
        current = ""
      }
      parts.push("*")
      i += 2
    } else {
      current += path[i]
      i++
    }
  }
  if (current) {
    parts.push(current)
  }
  return parts
}

function parseValue(raw: string): string | number | boolean {
  if (raw === "true") return true
  if (raw === "false") return false
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1)
  }
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1)
  }
  const num = Number(raw)
  if (!Number.isNaN(num)) {
    return num
  }
  return raw
}

export function evaluateCondition(event: RunEvent, condition: FilterCondition): boolean {
  const { field, operator, value } = condition
  const actualValue = getFieldValue(event, field)
  if (actualValue === undefined) {
    return false
  }
  if (Array.isArray(actualValue)) {
    return actualValue.some((v) => compareValues(v, operator, value))
  }
  return compareValues(actualValue, operator, value)
}

function getFieldValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (current === null || current === undefined) {
      return undefined
    }
    if (segment === "*") {
      if (!Array.isArray(current)) {
        return undefined
      }
      const remainingPath = path.slice(i + 1)
      if (remainingPath.length === 0) {
        return current
      }
      return current
        .map((item) => getFieldValue(item, remainingPath))
        .filter((v) => v !== undefined)
    }
    if (typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function compareValues(
  actual: unknown,
  operator: FilterCondition["operator"],
  expected: string | number | boolean,
): boolean {
  switch (operator) {
    case "==":
      return actual === expected
    case "!=":
      return actual !== expected
    case ">":
      return typeof actual === "number" && typeof expected === "number" && actual > expected
    case ">=":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected
    case "<":
      return typeof actual === "number" && typeof expected === "number" && actual < expected
    case "<=":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected
    default:
      return false
  }
}

function matchesStepFilter(stepNumber: number, filter: StepFilter): boolean {
  switch (filter.type) {
    case "exact":
      return stepNumber === filter.value
    case "gt":
      return filter.value !== undefined && stepNumber > filter.value
    case "gte":
      return filter.value !== undefined && stepNumber >= filter.value
    case "lt":
      return filter.value !== undefined && stepNumber < filter.value
    case "lte":
      return filter.value !== undefined && stepNumber <= filter.value
    case "range":
      return (
        filter.min !== undefined &&
        filter.max !== undefined &&
        stepNumber >= filter.min &&
        stepNumber <= filter.max
      )
    default:
      return true
  }
}

export type ApplyFiltersResult = {
  events: RunEvent[]
  totalBeforePagination: number
}

export function applyFilters(events: RunEvent[], options: FilterOptions): ApplyFiltersResult {
  let filtered = events
  if (options.step) {
    filtered = filtered.filter((e) => matchesStepFilter(e.stepNumber, options.step as StepFilter))
  }
  if (options.type) {
    filtered = filtered.filter((e) => e.type === options.type)
  }
  if (options.errors) {
    filtered = filtered.filter((e) => ERROR_EVENT_TYPES.has(e.type))
  }
  if (options.tools) {
    filtered = filtered.filter((e) => TOOL_EVENT_TYPES.has(e.type))
  }
  if (options.delegations) {
    filtered = filtered.filter((e) => DELEGATION_EVENT_TYPES.has(e.type))
  }
  if (options.filterExpression) {
    filtered = filtered.filter((e) =>
      evaluateCondition(e, options.filterExpression as FilterCondition),
    )
  }
  // Record total count before pagination
  const totalBeforePagination = filtered.length
  // Apply offset and take (pagination)
  const offset = options.offset ?? 0
  if (offset > 0) {
    filtered = filtered.slice(offset)
  }
  if (options.take !== undefined && options.take > 0) {
    filtered = filtered.slice(0, options.take)
  }
  // Add context events after pagination to preserve matched events
  if (options.context !== undefined && options.context > 0) {
    filtered = addContextEvents(events, filtered, options.context)
  }
  return { events: filtered, totalBeforePagination }
}

function addContextEvents(
  allEvents: RunEvent[],
  matchedEvents: RunEvent[],
  contextSize: number,
): RunEvent[] {
  const matchedIds = new Set(matchedEvents.map((e) => e.id))
  const resultIds = new Set<string>()
  for (const event of matchedEvents) {
    const index = allEvents.findIndex((e) => e.id === event.id)
    if (index === -1) continue
    const start = Math.max(0, index - contextSize)
    const end = Math.min(allEvents.length - 1, index + contextSize)
    for (let i = start; i <= end; i++) {
      resultIds.add(allEvents[i].id)
    }
  }
  return allEvents.filter((e) => resultIds.has(e.id) || matchedIds.has(e.id))
}
