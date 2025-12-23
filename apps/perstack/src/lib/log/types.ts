import type { Checkpoint, Job, RunEvent, RunSetting } from "@perstack/core"

export interface LogCommandOptions {
  job?: string
  run?: string
  checkpoint?: string
  step?: string
  type?: string
  errors?: boolean
  tools?: boolean
  delegations?: boolean
  filter?: string
  json?: boolean
  pretty?: boolean
  verbose?: boolean
  take?: number
  offset?: number
  context?: number
  messages?: boolean
  summary?: boolean
}

export interface FilterOptions {
  step?: StepFilter
  type?: string
  errors?: boolean
  tools?: boolean
  delegations?: boolean
  filterExpression?: FilterCondition
  take?: number
  offset?: number
  context?: number
}

export interface StepFilter {
  type: "exact" | "gt" | "gte" | "lt" | "lte" | "range"
  value?: number
  min?: number
  max?: number
}

export interface FilterCondition {
  field: string[]
  operator: "==" | "!=" | ">" | ">=" | "<" | "<="
  value: string | number | boolean
}

export interface LogOutput {
  job?: Job
  runs?: RunSetting[]
  checkpoints?: Checkpoint[]
  checkpoint?: Checkpoint
  events: RunEvent[]
  summary: LogSummary
  /** Indicates this is the latest job (no --job specified) */
  isLatestJob?: boolean
  /** Path to storage directory */
  storagePath?: string
  /** Total events before limit was applied */
  totalEventsBeforeLimit?: number
}

export interface LogSummary {
  totalEvents: number
  errorCount: number
  toolCallCount: number
  delegationCount: number
  stepRange?: { min: number; max: number }
}

export interface FormatterOptions {
  json: boolean
  pretty: boolean
  verbose: boolean
  messages: boolean
  summary: boolean
}
