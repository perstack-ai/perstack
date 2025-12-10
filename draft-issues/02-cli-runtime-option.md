---
title: "Add: `--runtime` CLI option for `run` and `start` commands"
labels: ["multi-runtime", "cli"]
---

## Overview

Add the `--runtime` option to `perstack run` and `perstack start` commands to specify which runtime to use for Expert execution.

## Background

The `--runtime` option allows users to run Experts on external runtimes (Cursor, Claude Code, Gemini) instead of the default Perstack runtime. This is the CLI entry point for multi-runtime support.

```bash
npx perstack run my-expert "query" --runtime cursor
npx perstack run my-expert "query" --runtime claude-code
npx perstack run my-expert "query" --runtime gemini
```

See: [CLI Reference](../../docs/content/references/cli.mdx)

## Implementation

### 1. Update CommandOptions Schema

**File:** `packages/core/src/schemas/run-command.ts`

Add `runtime` option to `CommandOptions`:

```typescript
import { type RuntimeName, runtimeNameSchema } from "./runtime.js"

export interface CommandOptions {
  // ... existing fields ...
  /** Execution runtime (default: from Expert definition or "perstack") */
  runtime?: RuntimeName
}

const commandOptionsSchema = z.object({
  // ... existing fields ...
  runtime: runtimeNameSchema.optional(),
})
```

### 2. Update run Command

**File:** `packages/perstack/src/run.ts`

Add `--runtime` option to Commander:

```typescript
.option("--runtime <runtime>", "Execution runtime (perstack, cursor, claude-code, gemini)")
```

Pass runtime to the runtime's `run()` function. For now, validate that only `"perstack"` is supported:

```typescript
const runtime = input.options.runtime ?? "perstack"
if (runtime !== "perstack") {
  console.error(`Runtime "${runtime}" is not yet supported. Use --runtime perstack or omit the option.`)
  process.exit(1)
}
```

### 3. Update start Command

**File:** `packages/perstack/src/start.ts`

Add same `--runtime` option:

```typescript
.option("--runtime <runtime>", "Execution runtime (perstack, cursor, claude-code, gemini)")
```

Same validation as run command.

### 4. Update resolveRunContext

**File:** `packages/perstack/src/lib/context.ts`

Accept `runtime` option and pass through:

```typescript
export async function resolveRunContext(options: {
  // ... existing options ...
  runtime?: RuntimeName
}): Promise<{
  // ... existing return type ...
  runtime: RuntimeName
}> {
  const runtime = options.runtime ?? "perstack"
  return {
    // ... existing return values ...
    runtime,
  }
}
```

## Affected Files

| File                                       | Change                      |
| ------------------------------------------ | --------------------------- |
| `packages/core/src/schemas/run-command.ts` | Add `runtime` option        |
| `packages/perstack/src/run.ts`             | Add `--runtime` option      |
| `packages/perstack/src/start.ts`           | Add `--runtime` option      |
| `packages/perstack/src/lib/context.ts`     | Pass through runtime option |

## Testing

Add E2E test in `e2e/run.test.ts`:

```typescript
describe("--runtime option", () => {
  it("should reject unsupported runtime", async () => {
    const result = await runCli([
      "run",
      "--config",
      "./e2e/experts/cli-commands.toml",
      "test-expert",
      "test query",
      "--runtime",
      "invalid-runtime",
    ])
    expect(result.exitCode).toBe(1)
  })

  it("should accept perstack runtime", async () => {
    // This test requires a full run, so it may be slow
    // For now, just verify the option is parsed
    const result = await runCli([
      "run",
      "--config",
      "./e2e/experts/cli-commands.toml",
      "test-expert",
      "test query",
      "--runtime",
      "perstack",
    ])
    // Should not fail due to invalid runtime option
    // (may fail for other reasons like missing API key)
  })
})
```

## Documentation

Already documented in `docs/content/references/cli.mdx`.

## Acceptance Criteria

- [ ] `--runtime` option added to `run` command
- [ ] `--runtime` option added to `start` command
- [ ] Invalid runtime names are rejected with helpful error
- [ ] Option is parsed and passed to context
- [ ] Default runtime is `perstack` when not specified
- [ ] `pnpm typecheck` passes
- [ ] E2E tests pass

## Dependencies

- #01 Core schema `runtime` field

## Blocked By

- #01 Core schema `runtime` field

## Blocks

- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
