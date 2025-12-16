export const TERMINAL_EVENT_TYPES = [
  "completeRun",
  "stopRunByInteractiveTool",
  "stopRunByDelegate",
  "stopRunByExceededMaxSteps",
] as const

export type TerminalEventType = (typeof TERMINAL_EVENT_TYPES)[number]
