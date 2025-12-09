---
title: "Add: RuntimeAdapter interface and adapter factory"
labels: ["multi-runtime", "runtime"]
---

## Overview

Define the `RuntimeAdapter` interface and create an adapter factory that returns the appropriate adapter based on runtime name. This is the foundation for plugging in external runtime implementations.

## Background

The `RuntimeAdapter` interface abstracts away the execution details of different runtimes. Each adapter handles:
- Prerequisites checking (is the CLI installed?)
- Expert definition conversion (to runtime-specific format)
- CLI execution (headless mode)
- Output parsing (to Perstack event format)

```
RuntimeAdapter
├── PerstackAdapter (existing runtime, wrapped)
├── CursorAdapter
├── ClaudeCodeAdapter
└── GeminiAdapter
```

## Implementation

### 1. Define RuntimeAdapter Interface

**File:** `packages/runtime/src/adapters/types.ts` (new file)

```typescript
import type { Checkpoint, Expert, RunEvent, RuntimeEvent, RunSetting } from "@perstack/core"

export type AdapterRunParams = {
  setting: RunSetting
  checkpoint?: Checkpoint
  eventListener?: (event: RunEvent | RuntimeEvent) => void
}

export type AdapterRunResult = {
  checkpoint: Checkpoint
  events: (RunEvent | RuntimeEvent)[]
}

export interface RuntimeAdapter {
  /** Runtime name (e.g., "perstack", "cursor") */
  readonly name: string

  /** Check if runtime prerequisites are met */
  checkPrerequisites(): Promise<PrerequisiteResult>

  /** Convert Expert definition to runtime-specific format */
  convertExpert(expert: Expert): RuntimeExpertConfig

  /** Execute Expert on this runtime */
  run(params: AdapterRunParams): Promise<AdapterRunResult>
}

export type PrerequisiteResult =
  | { ok: true }
  | { ok: false; error: PrerequisiteError }

export type PrerequisiteError = {
  type: "cli-not-found" | "auth-missing" | "version-mismatch"
  message: string
  helpUrl?: string
}

export type RuntimeExpertConfig = {
  instruction: string
  delegateContext?: string
}
```

### 2. Create Adapter Factory

**File:** `packages/runtime/src/adapters/factory.ts` (new file)

```typescript
import type { RuntimeName } from "@perstack/core"
import type { RuntimeAdapter } from "./types.js"
import { PerstackAdapter } from "./perstack-adapter.js"

const adapters: Partial<Record<RuntimeName, () => RuntimeAdapter>> = {
  perstack: () => new PerstackAdapter(),
  // cursor: () => new CursorAdapter(),       // Added in #05
  // "claude-code": () => new ClaudeCodeAdapter(), // Added in #06
  // gemini: () => new GeminiAdapter(),       // Added in #07
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
```

### 3. Create PerstackAdapter (Wrapper)

**File:** `packages/runtime/src/adapters/perstack-adapter.ts` (new file)

Wrap the existing `run()` function as an adapter:

```typescript
import type { RuntimeAdapter, AdapterRunParams, AdapterRunResult, PrerequisiteResult, RuntimeExpertConfig } from "./types.js"
import type { Expert } from "@perstack/core"
import { run as perstackRun } from "../runtime.js"

export class PerstackAdapter implements RuntimeAdapter {
  readonly name = "perstack"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    // Perstack runtime is always available
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    // No conversion needed for native runtime
    return {
      instruction: expert.instruction,
    }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const events: (RunEvent | RuntimeEvent)[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      events.push(event)
      params.eventListener?.(event)
    }

    const checkpoint = await perstackRun(
      { setting: params.setting, checkpoint: params.checkpoint },
      { eventListener },
    )

    return { checkpoint, events }
  }
}
```

### 4. Create Adapter Index

**File:** `packages/runtime/src/adapters/index.ts` (new file)

```typescript
export { getAdapter, isAdapterAvailable } from "./factory.js"
export type {
  RuntimeAdapter,
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  PrerequisiteError,
  RuntimeExpertConfig,
} from "./types.js"
export { PerstackAdapter } from "./perstack-adapter.js"
```

### 5. Export from Runtime Package

**File:** `packages/runtime/src/index.ts`

Add exports:

```typescript
export { getAdapter, isAdapterAvailable } from "./adapters/index.js"
export type {
  RuntimeAdapter,
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  PrerequisiteError,
  RuntimeExpertConfig,
} from "./adapters/index.js"
```

## Affected Files

| File                                                | Change                        |
| --------------------------------------------------- | ----------------------------- |
| `packages/runtime/src/adapters/types.ts`            | New: Interface definitions    |
| `packages/runtime/src/adapters/factory.ts`          | New: Adapter factory          |
| `packages/runtime/src/adapters/perstack-adapter.ts` | New: Perstack adapter wrapper |
| `packages/runtime/src/adapters/index.ts`            | New: Exports                  |
| `packages/runtime/src/index.ts`                     | Export adapters               |

## Testing

Create `packages/runtime/src/adapters/factory.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { getAdapter, isAdapterAvailable } from "./factory.js"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("getAdapter", () => {
  it("returns PerstackAdapter for perstack", () => {
    const adapter = getAdapter("perstack")
    expect(adapter).toBeInstanceOf(PerstackAdapter)
    expect(adapter.name).toBe("perstack")
  })

  it("throws for unsupported runtime", () => {
    expect(() => getAdapter("cursor" as any)).toThrow("not supported")
  })
})

describe("isAdapterAvailable", () => {
  it("returns true for perstack", () => {
    expect(isAdapterAvailable("perstack")).toBe(true)
  })

  it("returns false for unimplemented runtime", () => {
    expect(isAdapterAvailable("cursor")).toBe(false)
  })
})
```

Create `packages/runtime/src/adapters/perstack-adapter.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("PerstackAdapter", () => {
  it("has correct name", () => {
    const adapter = new PerstackAdapter()
    expect(adapter.name).toBe("perstack")
  })

  it("prerequisites always pass", async () => {
    const adapter = new PerstackAdapter()
    const result = await adapter.checkPrerequisites()
    expect(result.ok).toBe(true)
  })

  it("convertExpert returns instruction unchanged", () => {
    const adapter = new PerstackAdapter()
    const expert = {
      key: "test",
      name: "test",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {},
      delegates: [],
      tags: [],
      runtime: ["perstack"],
    }
    const config = adapter.convertExpert(expert)
    expect(config.instruction).toBe("Test instruction")
  })
})
```

## Documentation

No additional documentation needed.

## Acceptance Criteria

- [ ] `RuntimeAdapter` interface defined
- [ ] `getAdapter()` factory function implemented
- [ ] `PerstackAdapter` wraps existing runtime
- [ ] `isAdapterAvailable()` helper function implemented
- [ ] All adapters exported from `@perstack/runtime`
- [ ] Unit tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

- #01 Core schema `runtime` field

## Blocked By

- #01 Core schema `runtime` field

## Blocks

- #04 Integrate adapters into CLI
- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
