import type { RunEvent } from "@perstack/core"

export const UI_CONSTANTS = {
  MAX_VISIBLE_LIST_ITEMS: 25,
  MAX_VISIBLE_EXPERTS_INLINE: 5,
  MAX_EVENTS: 1000,
  TRUNCATE_TEXT_SHORT: 40,
  TRUNCATE_TEXT_MEDIUM: 80,
  TRUNCATE_TEXT_DEFAULT: 100,
  TRUNCATE_TEXT_LONG: 200,
} as const

export const RENDER_CONSTANTS = {
  EXEC_OUTPUT_MAX_LINES: 4,
  TODO_MAX_VISIBLE_ITEMS: 5,
  NEW_TODO_MAX_PREVIEW: 3,
  GLOB_MAX_FILES: 4,
  LIST_DIR_MAX_ITEMS: 4,
} as const

export const INDICATOR = {
  CHEVRON_RIGHT: ">",
  BULLET: "●",
  TREE: "└",
  ELLIPSIS: "...",
} as const

export const STOP_EVENT_TYPES = [
  "stopRunByInteractiveTool",
  "stopRunByDelegate",
  "stopRunByExceededMaxSteps",
] as const satisfies readonly RunEvent["type"][]

export const KEY_BINDINGS = {
  NAVIGATE_UP: "↑",
  NAVIGATE_DOWN: "↓",
  SELECT: "Enter",
  BACK: "b",
  ESCAPE: "Esc",
  INPUT_MODE: "i",
  HISTORY: "h",
  NEW: "n",
  CHECKPOINTS: "c",
  EVENTS: "e",
  RESUME: "Enter",
} as const

export const KEY_HINTS = {
  NAVIGATE: `${KEY_BINDINGS.NAVIGATE_UP}${KEY_BINDINGS.NAVIGATE_DOWN}:Navigate`,
  SELECT: `${KEY_BINDINGS.SELECT}:Select`,
  RESUME: `${KEY_BINDINGS.RESUME}:Resume`,
  BACK: `${KEY_BINDINGS.BACK}:Back`,
  CANCEL: `${KEY_BINDINGS.ESCAPE}:Cancel`,
  INPUT: `${KEY_BINDINGS.INPUT_MODE}:Input`,
  HISTORY: `${KEY_BINDINGS.HISTORY}:History`,
  NEW: `${KEY_BINDINGS.NEW}:New Run`,
  CHECKPOINTS: `${KEY_BINDINGS.CHECKPOINTS}:Checkpoints`,
  EVENTS: `${KEY_BINDINGS.EVENTS}:Events`,
  QUIT: "q:Quit",
  ESC_BACK: `${KEY_BINDINGS.ESCAPE}:Back`,
  CONFIRM: `${KEY_BINDINGS.SELECT}:Confirm`,
} as const
