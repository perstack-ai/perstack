---
title: "Update: Integrate RuntimeAdapter into CLI run/start commands"
labels: ["multi-runtime", "cli", "runtime"]
---

## Overview

Update `perstack run` and `perstack start` commands to use the `RuntimeAdapter` system instead of directly calling the `run()` function. This enables the CLI to dispatch Expert execution to different runtimes based on the `--runtime` option.

## Background

Currently, the CLI directly calls `@perstack/runtime`'s `run()` function. With multi-runtime support, the CLI needs to:

1. Determine the target runtime from `--runtime` option or Expert definition
2. Get the appropriate adapter via `getAdapter()`
3. Check prerequisites
4. Execute via the adapter's `run()` method

## Implementation

### 1. Create Runtime Dispatcher

**File:** `packages/perstack/src/lib/runtime-dispatcher.ts` (new file)

```typescript
import type { Checkpoint, Expert, RuntimeName, RunSetting, RunEvent, RuntimeEvent } from "@perstack/core"
import { getAdapter, isAdapterAvailable } from "@perstack/runtime"

export type DispatchParams = {
  setting: RunSetting
  checkpoint?: Checkpoint
  runtime: RuntimeName
  eventListener?: (event: RunEvent | RuntimeEvent) => void
}

export type DispatchResult = {
  checkpoint: Checkpoint
}

export async function dispatchToRuntime(params: DispatchParams): Promise<DispatchResult> {
  const { setting, checkpoint, runtime, eventListener } = params

  if (!isAdapterAvailable(runtime)) {
    throw new Error(
      `Runtime "${runtime}" is not available. ` +
      `Available runtimes: perstack. ` +
      `External runtimes (cursor, claude-code, gemini) will be available in future updates.`
    )
  }

  const adapter = getAdapter(runtime)

  // Check prerequisites
  const prereqResult = await adapter.checkPrerequisites()
  if (!prereqResult.ok) {
    const { error } = prereqResult
    let message = `Runtime "${runtime}" prerequisites not met: ${error.message}`
    if (error.helpUrl) {
      message += `\nSee: ${error.helpUrl}`
    }
    throw new Error(message)
  }

  // Execute via adapter
  const result = await adapter.run({
    setting,
    checkpoint,
    eventListener,
  })

  return { checkpoint: result.checkpoint }
}
```

### 2. Update run Command

**File:** `packages/perstack/src/run.ts`

Replace direct `run()` call with dispatcher:

```typescript
import { dispatchToRuntime } from "./lib/runtime-dispatcher.js"

// In action handler:
const runtime = input.options.runtime ?? "perstack"

try {
  const { perstackConfig, checkpoint, env, providerConfig, model, experts } =
    await resolveRunContext({ /* ... existing options ... */ })

  await dispatchToRuntime({
    setting: {
      jobId: checkpoint?.jobId ?? input.options.jobId,
      runId: checkpoint?.runId ?? input.options.runId,
      expertKey: input.expertKey,
      input: input.options.interactiveToolCallResult && checkpoint
        ? parseInteractiveToolCallResult(input.query, checkpoint)
        : { text: input.query },
      experts,
      model,
      providerConfig,
      temperature: input.options.temperature ?? perstackConfig.temperature,
      maxSteps: input.options.maxSteps ?? perstackConfig.maxSteps,
      maxRetries: input.options.maxRetries ?? perstackConfig.maxRetries,
      timeout: input.options.timeout ?? perstackConfig.timeout,
      perstackApiBaseUrl: perstackConfig.perstackApiBaseUrl,
      perstackApiKey: env.PERSTACK_API_KEY,
      perstackBaseSkillCommand: perstackConfig.perstackBaseSkillCommand,
      env,
    },
    checkpoint,
    runtime,
  })
} catch (error) {
  // ... error handling ...
}
```

### 3. Update start Command

**File:** `packages/perstack/src/start.ts`

Similar update to use dispatcher:

```typescript
import { dispatchToRuntime } from "./lib/runtime-dispatcher.js"

// In the while loop:
const runResult = await dispatchToRuntime({
  setting: {
    jobId: currentJobId,
    runId: currentRunId,
    expertKey: finalExpertKey,
    // ... rest of setting ...
  },
  checkpoint: currentCheckpoint,
  runtime,
  eventListener: result.eventListener,
})
```

Note: For `start` command, the event listener integration needs special handling since it uses TUI. This will be fully addressed in #09 TUI Multi-Runtime.

### 4. Runtime Selection Logic

The `runtime` field in Expert definition is a **compatibility declaration**, not parallel execution:

```toml
[experts.my-expert]
runtime = ["cursor", "claude-code"]  # This Expert works on both runtimes
```

**Selection priority:**
1. `--runtime` CLI option (explicit user choice)
2. First compatible runtime from Expert's `runtime` array
3. Default to `"perstack"` if Expert has no `runtime` field

```typescript
function selectRuntime(expert: Expert, cliRuntime?: RuntimeName): RuntimeName {
  if (cliRuntime) {
    if (!expert.runtime.includes(cliRuntime)) {
      throw new Error(
        `Expert "${expert.key}" does not support runtime "${cliRuntime}". ` +
        `Supported: ${expert.runtime.join(", ")}`
      )
    }
    return cliRuntime
  }
  return expert.runtime[0] ?? "perstack"
}
```

## Affected Files

| File                                              | Change                                 |
| ------------------------------------------------- | -------------------------------------- |
| `packages/perstack/src/lib/runtime-dispatcher.ts` | New: Dispatch logic                    |
| `packages/perstack/src/run.ts`                    | Use dispatcher instead of direct run() |
| `packages/perstack/src/start.ts`                  | Use dispatcher (partial, full in #09)  |

## Testing

Add E2E test in `e2e/run.test.ts`:

```typescript
describe("runtime dispatcher", () => {
  it("should use perstack runtime by default", async () => {
    const result = await runExpert("test-expert", "test query", {
      configPath: "./e2e/experts/special-tools.toml",
      timeout: 60000,
    })
    expect(result.exitCode).toBe(0)
    // Verify events are from perstack runtime
    const initEvent = result.events.find((e) => e.type === "initializeRuntime")
    expect(initEvent).toBeDefined()
  })

  it("should fail gracefully for unavailable runtime", async () => {
    const result = await runCli([
      "run",
      "--config",
      "./e2e/experts/special-tools.toml",
      "--runtime",
      "cursor",
      "test-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("not available")
  })
})
```

## Documentation

No additional documentation needed.

## Acceptance Criteria

- [ ] `dispatchToRuntime()` function created
- [ ] `run` command uses dispatcher
- [ ] `start` command uses dispatcher (basic integration)
- [ ] Unavailable runtimes show helpful error message
- [ ] Prerequisite failures show helpful error with URL
- [ ] Existing behavior unchanged for `--runtime perstack`
- [ ] E2E tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

- #02 CLI `--runtime` option
- #03 RuntimeAdapter interface

## Blocked By

- #02 CLI `--runtime` option
- #03 RuntimeAdapter interface

## Blocks

- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
- #09 TUI Multi-Runtime
