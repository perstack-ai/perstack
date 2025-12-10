import type { RuntimeName } from "@perstack/core"
import { PerstackAdapter } from "./perstack-adapter.js"
import type { RuntimeAdapter } from "./types.js"

const adapters: Partial<Record<RuntimeName, () => RuntimeAdapter>> = {
  perstack: () => new PerstackAdapter(),
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
