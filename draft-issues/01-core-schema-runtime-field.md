---
title: "Add: `runtime` field to Expert schema"
labels: ["multi-runtime", "core"]
---

## Overview

Add the `runtime` field to Expert schema in `@perstack/core` to support multi-runtime execution.

## Background

The `runtime` field declares **which runtimes an Expert is compatible with** (similar to `engines` in `package.json`). This is a compatibility declaration, not parallel execution:

```toml
runtime = ["cursor", "claude-code"]  # Works on both, runs on ONE at a time
```

This enables:
- Publishing Experts that work across multiple runtimes
- Users choosing their preferred runtime via `--runtime` option
- Registry filtering by runtime compatibility

See: [Multi-Runtime Support Documentation](../../docs/content/using-experts/multi-runtime.mdx)

## Implementation

### 1. Add Runtime Name Type Definition

**File:** `packages/core/src/schemas/runtime-name.ts` (new file)

Create a new file to avoid confusion with `runtime.ts` (which contains `RunEvent`, `RuntimeEvent`, etc.):

```typescript
import { z } from "zod"

export type RuntimeName = "perstack" | "cursor" | "claude-code" | "gemini"

export const runtimeNameSchema = z.enum(["perstack", "cursor", "claude-code", "gemini"])
```

> **Note:** `RuntimeName` (execution environment) is semantically different from `RuntimeEvent` (infrastructure events). Separate file prevents confusion.

### 2. Update Expert Schema

**File:** `packages/core/src/schemas/expert.ts`

Add `runtime` field to `Expert` interface:

```typescript
export interface Expert {
  // ... existing fields ...
  /** Target runtimes for this Expert (default: ["perstack"]) */
  runtime: RuntimeName[]
}
```

Add to `expertSchema`:

```typescript
export const expertSchema = z.object({
  // ... existing fields ...
  runtime: z
    .union([
      runtimeNameSchema,
      z.array(runtimeNameSchema),
    ])
    .optional()
    .default(["perstack"])
    .transform((value) => (typeof value === "string" ? [value] : value)),
})
```

### 3. Update PerstackConfig Expert Schema

**File:** `packages/core/src/schemas/perstack-toml.ts`

Add `runtime` field to `PerstackConfigExpert`:

```typescript
export interface PerstackConfigExpert {
  // ... existing fields ...
  /** Target runtimes (default: ["perstack"]) */
  runtime?: RuntimeName | RuntimeName[]
}
```

Update `perstackConfigSchema.experts`:

```typescript
z.object({
  // ... existing fields ...
  runtime: z
    .union([
      runtimeNameSchema,
      z.array(runtimeNameSchema),
    ])
    .optional(),
})
```

### 4. Export New Types

**File:** `packages/core/src/index.ts`

Add exports:

```typescript
export type { RuntimeName } from "./schemas/runtime-name.js"
export { runtimeNameSchema } from "./schemas/runtime-name.js"
```

## Affected Files

| File                                         | Change                                  |
| -------------------------------------------- | --------------------------------------- |
| `packages/core/src/schemas/runtime-name.ts`  | New: `RuntimeName` type and schema      |
| `packages/core/src/schemas/expert.ts`        | Add `runtime` field, import RuntimeName |
| `packages/core/src/schemas/perstack-toml.ts` | Add `runtime` field, import RuntimeName |
| `packages/core/src/index.ts`                 | Export new types from runtime-name.ts   |

## Testing

Add tests in `packages/core/src/schemas/expert.test.ts`:

1. Default runtime value is `["perstack"]`
2. Single string `"cursor"` transforms to `["cursor"]`
3. Array `["cursor", "claude-code"]` is preserved
4. Invalid runtime name is rejected

Example test:

```typescript
describe("runtime field", () => {
  it("defaults to perstack", () => {
    const result = expertSchema.parse({
      key: "test",
      name: "test",
      version: "1.0.0",
      instruction: "test",
    })
    expect(result.runtime).toEqual(["perstack"])
  })

  it("transforms single string to array", () => {
    const result = expertSchema.parse({
      key: "test",
      name: "test",
      version: "1.0.0",
      instruction: "test",
      runtime: "cursor",
    })
    expect(result.runtime).toEqual(["cursor"])
  })

  it("preserves array", () => {
    const result = expertSchema.parse({
      key: "test",
      name: "test",
      version: "1.0.0",
      instruction: "test",
      runtime: ["cursor", "claude-code"],
    })
    expect(result.runtime).toEqual(["cursor", "claude-code"])
  })

  it("rejects invalid runtime", () => {
    expect(() =>
      expertSchema.parse({
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "test",
        runtime: "invalid",
      }),
    ).toThrow()
  })
})
```

## Documentation

No additional documentation needed (already documented in `multi-runtime.mdx`).

## Acceptance Criteria

- [ ] `RuntimeName` type exported from `@perstack/core`
- [ ] `runtimeNameSchema` exported from `@perstack/core`
- [ ] `Expert.runtime` field defaults to `["perstack"]`
- [ ] Single string runtime transforms to array
- [ ] Invalid runtime names are rejected
- [ ] All tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

None (this is the first issue in the implementation chain)

## Blocked By

None

## Blocks

- #02 CLI --runtime option
- #03 RuntimeAdapter interface
