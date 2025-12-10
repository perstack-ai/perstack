---
title: "Update: TUI support for external runtime execution"
labels: ["multi-runtime", "tui"]
---

## Overview

Update `perstack start` command's TUI to display external runtime execution status and handle the event stream from external runtimes.

## Background

The `perstack start` command provides an interactive TUI for Expert development. With multi-runtime support, the TUI needs to:

1. Display which runtime is being used
2. Handle events from external runtimes (simplified format)
3. Show appropriate status indicators
4. Support checkpoint viewing for external runtime executions

## Implementation

### 1. Update TUI Config Type

**File:** `packages/tui/src/types.ts`

Add runtime to config:

```typescript
import type { RuntimeName } from "@perstack/core"

export interface TuiConfig {
  runtimeVersion: string
  model: string
  temperature: number
  maxSteps?: number
  maxRetries: number
  timeout: number
  contextWindowUsage: number
  /** Current execution runtime */
  runtime?: RuntimeName
}
```

### 2. Update Config Display Component

**File:** `packages/tui/src/components/ConfigDisplay.tsx`

Display runtime name when not `perstack`:

```tsx
import type { RuntimeName } from "@perstack/core"

// In component:
{config.runtime && config.runtime !== "perstack" && (
  <Box>
    <Text color="yellow">Runtime: </Text>
    <Text>{config.runtime}</Text>
  </Box>
)}
```

### 3. Update Event Handler

**File:** `packages/tui/src/components/EventStream.tsx`

Handle external runtime events:

```tsx
// Add support for external runtime init event
if (event.type === "initializeRuntime") {
  const runtimeEvent = event as RuntimeEvent
  if (runtimeEvent.runtimeVersion?.startsWith("external:")) {
    const runtime = runtimeEvent.runtimeVersion.replace("external:", "")
    return (
      <Box>
        <Text color="cyan">Executing on {runtime} runtime...</Text>
      </Box>
    )
  }
}
```

### 4. Update Start Command

**File:** `packages/perstack/src/start.ts`

Pass runtime to TUI:

```typescript
const runtime = input.options.runtime ?? "perstack"

const result = await renderStart({
  // ... existing options ...
  initialConfig: {
    runtimeVersion,
    model,
    temperature,
    maxSteps,
    maxRetries,
    timeout,
    contextWindowUsage: checkpoint?.contextWindowUsage ?? 0,
    runtime,
  },
  // ...
})
```

### 5. Handle External Runtime Limitations

External runtimes don't support interactive tool calls in the same way. Update TUI to show appropriate message:

**File:** `packages/tui/src/components/InteractivePrompt.tsx`

```tsx
// Show warning for external runtimes
{config.runtime && config.runtime !== "perstack" && (
  <Box marginTop={1}>
    <Text color="yellow">
      Note: Interactive tool calls may not be fully supported on {config.runtime} runtime.
    </Text>
  </Box>
)}
```

### 6. Update Checkpoint History Display

**File:** `packages/tui/src/components/CheckpointHistory.tsx`

Show runtime badge for external checkpoints:

```tsx
// In checkpoint item rendering:
{checkpoint.metadata?.externalExecution && (
  <Text color="magenta">[{checkpoint.metadata.runtime}]</Text>
)}
```

## Affected Files

| File                                                | Change                         |
| --------------------------------------------------- | ------------------------------ |
| `packages/tui/src/types.ts`                         | Add `runtime` to config type   |
| `packages/tui/src/components/ConfigDisplay.tsx`     | Display runtime name           |
| `packages/tui/src/components/EventStream.tsx`       | Handle external runtime events |
| `packages/tui/src/components/InteractivePrompt.tsx` | Show external runtime warning  |
| `packages/tui/src/components/CheckpointHistory.tsx` | Show runtime badge             |
| `packages/perstack/src/start.ts`                    | Pass runtime to TUI            |

## Testing

TUI components are not unit tested (as per AGENTS.md). Manual testing required:

### Manual Test Cases

1. **Runtime display**
   ```bash
   npx perstack start --runtime cursor
   # Verify: Runtime is displayed in config panel
   ```

2. **External runtime event**
   ```bash
   npx perstack start my-expert --runtime cursor
   # Enter query
   # Verify: "Executing on cursor runtime..." message appears
   ```

3. **Checkpoint history**
   ```bash
   npx perstack start
   # Navigate to job with external runtime checkpoints
   # Verify: [cursor] badge appears on external checkpoints
   ```

4. **Interactive warning**
   ```bash
   npx perstack start my-expert --runtime cursor
   # Verify: Warning about interactive tools appears
   ```

## Documentation

No additional documentation needed.

## Acceptance Criteria

- [ ] Runtime name displayed in config panel when not `perstack`
- [ ] External runtime init event shows "Executing on X runtime" message
- [ ] Checkpoint history shows runtime badge for external checkpoints
- [ ] Interactive prompt shows warning for external runtimes
- [ ] TUI gracefully handles external runtime events
- [ ] `pnpm typecheck` passes

## Dependencies

- #04 Integrate adapters into CLI
- #08 Event Normalization

## Blocked By

- #04 Integrate adapters into CLI
- #08 Event Normalization

## Blocks

- #10 E2E Tests for Multi-Runtime
