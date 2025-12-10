import type { RuntimeName } from "@perstack/core"
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"
import { CursorAdapter } from "./cursor-adapter.js"
import { GeminiAdapter } from "./gemini-adapter.js"
import { PerstackAdapter } from "./perstack-adapter.js"
import type { RuntimeAdapter } from "./types.js"

const adapters: Record<RuntimeName, () => RuntimeAdapter> = {
  perstack: () => new PerstackAdapter(),
  cursor: () => new CursorAdapter(),
  "claude-code": () => new ClaudeCodeAdapter(),
  gemini: () => new GeminiAdapter(),
}

export function getAdapter(runtime: RuntimeName): RuntimeAdapter {
  const factory = adapters[runtime]
  if (!factory) {
    throw new Error(
      `Runtime "${runtime}" is not supported. Available runtimes: ${Object.keys(adapters).join(", ")}`,
    )
  }
  return factory()
}

export function isAdapterAvailable(runtime: RuntimeName): boolean {
  return runtime in adapters
}
