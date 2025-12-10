import { ClaudeCodeAdapter } from "@perstack/claude-code"
import {
  getAdapter as coreGetAdapter,
  getRegisteredRuntimes as coreGetRegisteredRuntimes,
  isAdapterAvailable as coreIsAdapterAvailable,
  type RuntimeAdapter,
  type RuntimeName,
  registerAdapter,
} from "@perstack/core"
import { CursorAdapter } from "@perstack/cursor"
import { GeminiAdapter } from "@perstack/gemini"
import "@perstack/runtime"

registerAdapter("cursor", () => new CursorAdapter())
registerAdapter("claude-code", () => new ClaudeCodeAdapter())
registerAdapter("gemini", () => new GeminiAdapter())

export function getAdapter(runtime: RuntimeName): RuntimeAdapter {
  return coreGetAdapter(runtime)
}

export function isAdapterAvailable(runtime: RuntimeName): boolean {
  return coreIsAdapterAvailable(runtime)
}

export function getRegisteredRuntimes(): RuntimeName[] {
  return coreGetRegisteredRuntimes()
}
