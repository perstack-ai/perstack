import type { RuntimeName } from "../schemas/runtime-name.js"
import type { RuntimeAdapter } from "./types.js"

const adapters: Map<RuntimeName, () => RuntimeAdapter> = new Map()

export function registerAdapter(runtime: RuntimeName, factory: () => RuntimeAdapter): void {
  adapters.set(runtime, factory)
}

export function getAdapter(runtime: RuntimeName): RuntimeAdapter {
  const factory = adapters.get(runtime)
  if (!factory) {
    throw new Error(
      `Runtime "${runtime}" is not registered. Available runtimes: ${Array.from(adapters.keys()).join(", ")}`,
    )
  }
  return factory()
}

export function isAdapterAvailable(runtime: RuntimeName): boolean {
  return adapters.has(runtime)
}

export function getRegisteredRuntimes(): RuntimeName[] {
  return Array.from(adapters.keys())
}
