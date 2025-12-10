---
title: "Add: Event normalization for external runtime output"
labels: ["multi-runtime", "runtime"]
---

## Overview

Create output parsing and event normalization utilities to convert external runtime CLI output into Perstack's standard event format.

## Background

External runtimes (Cursor, Claude Code, Gemini) produce different output formats. To maintain consistency in checkpoint storage and event handling, we need to:

1. Parse runtime-specific output formats
2. Normalize to Perstack's `RunEvent` and `RuntimeEvent` types
3. Create standardized checkpoints regardless of runtime

This enables:
- Unified job history across runtimes
- Consistent checkpoint storage in `perstack/jobs/`
- TUI compatibility with external runtime output

## Implementation

### 1. Create Output Parser

**File:** `packages/runtime/src/adapters/output-parser.ts` (new file)

```typescript
import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  Expert,
  ExpertMessage,
  RunEvent,
  RuntimeEvent,
  RuntimeName,
} from "@perstack/core"
import { createEmptyUsage } from "../usage.js"

export type ParsedOutput = {
  events: (RunEvent | RuntimeEvent)[]
  finalOutput: string
}

export function parseExternalOutput(stdout: string, runtime: RuntimeName): ParsedOutput {
  // Different parsers for different runtimes
  switch (runtime) {
    case "cursor":
      return parseCursorOutput(stdout)
    case "claude-code":
      return parseClaudeCodeOutput(stdout)
    case "gemini":
      return parseGeminiOutput(stdout)
    default:
      return { events: [], finalOutput: stdout }
  }
}

function parseCursorOutput(stdout: string): ParsedOutput {
  return {
    events: [],
    finalOutput: stdout.trim(),
  }
}

function parseClaudeCodeOutput(stdout: string): ParsedOutput {
  // Claude Code outputs JSON-LD style events
  // Each line may be a JSON event
  const lines = stdout.split("\n")
  const events: (RunEvent | RuntimeEvent)[] = []
  let finalOutput = ""
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.type === "result" || parsed.type === "output") {
        finalOutput = parsed.content || parsed.text || ""
      }
    } catch {
      // Not JSON, append to final output
      if (finalOutput) {
        finalOutput += "\n" + trimmed
      } else {
        finalOutput = trimmed
      }
    }
  }
  
  return {
    events,
    finalOutput: finalOutput.trim() || stdout.trim(),
  }
}

function parseGeminiOutput(stdout: string): ParsedOutput {
  return {
    events: [],
    finalOutput: stdout.trim(),
  }
}

export type CreateCheckpointParams = {
  jobId: string
  runId: string
  expertKey: string
  expert: Pick<Expert, "key" | "name" | "version">
  output: string
  runtime: RuntimeName
}

export function createNormalizedCheckpoint(params: CreateCheckpointParams): Checkpoint {
  const { jobId, runId, expertKey, expert, output, runtime } = params
  const checkpointId = createId()
  const timestamp = Date.now()
  
  // Create a minimal checkpoint with the external runtime's output
  const expertMessage: ExpertMessage = {
    type: "expertMessage",
    contents: [
      {
        type: "textPart",
        id: createId(),
        text: output,
      },
    ],
    timestamp,
  }
  
  return {
    id: checkpointId,
    jobId,
    runId,
    status: "completed",
    stepNumber: 1,
    messages: [expertMessage],
    expert: {
      key: expert.key,
      name: expert.name,
      version: expert.version,
    },
    usage: createEmptyUsage(),
    metadata: {
      runtime,
      externalExecution: true,
    },
  }
}

export function createRuntimeInitEvent(
  jobId: string,
  runId: string,
  expertName: string,
  runtime: RuntimeName,
): RuntimeEvent {
  return {
    type: "initializeRuntime",
    id: createId(),
    timestamp: Date.now(),
    jobId,
    runId,
    runtimeVersion: `external:${runtime}`,
    expertName,
    experts: [],
    model: `${runtime}:default`,
    temperature: 0,
    maxRetries: 0,
    timeout: 0,
  }
}

export function createCompleteRunEvent(
  jobId: string,
  runId: string,
  expertKey: string,
  checkpoint: Checkpoint,
  output: string,
): RunEvent {
  return {
    type: "completeRun",
    id: createId(),
    expertKey,
    timestamp: Date.now(),
    jobId,
    runId,
    stepNumber: 1,
    checkpoint,
    step: {
      stepNumber: 1,
      newMessages: [],
      usage: createEmptyUsage(),
      startedAt: Date.now(),
    },
    text: output,
    usage: createEmptyUsage(),
  }
}
```

### 2. Update Checkpoint Schema for Metadata

**File:** `packages/core/src/schemas/checkpoint.ts`

Add optional `metadata` field to checkpoint:

```typescript
export interface Checkpoint {
  // ... existing fields ...
  /** Optional metadata for runtime-specific information */
  metadata?: {
    /** Runtime that executed this checkpoint */
    runtime?: RuntimeName
    /** Whether this was executed by an external runtime */
    externalExecution?: boolean
    /** Additional runtime-specific data */
    [key: string]: unknown
  }
}
```

Update `checkpointSchema`:

```typescript
export const checkpointSchema = z.object({
  // ... existing fields ...
  metadata: z
    .object({
      runtime: runtimeNameSchema.optional(),
      externalExecution: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
})
```

### 3. Export from Runtime Package

**File:** `packages/runtime/src/adapters/index.ts`

```typescript
export {
  parseExternalOutput,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  createCompleteRunEvent,
  type ParsedOutput,
  type CreateCheckpointParams,
} from "./output-parser.js"
```

## Affected Files

| File                                             | Change                                      |
| ------------------------------------------------ | ------------------------------------------- |
| `packages/runtime/src/adapters/output-parser.ts` | New: Output parsing utilities               |
| `packages/core/src/schemas/checkpoint.ts`        | Add `metadata` field (interface and schema) |
| `packages/runtime/src/adapters/index.ts`         | Export parser functions                     |
| `packages/runtime/src/index.ts`                  | Re-export from adapters/index.ts            |

> **Backward Compatibility:** The `metadata` field uses `.optional()` so existing checkpoints without this field will parse correctly. No migration needed.

## Testing

Create `packages/runtime/src/adapters/output-parser.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import {
  parseExternalOutput,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  createCompleteRunEvent,
} from "./output-parser.js"

describe("parseExternalOutput", () => {
  describe("cursor", () => {
    it("returns trimmed output", () => {
      const result = parseExternalOutput("  Hello World  \n", "cursor")
      expect(result.finalOutput).toBe("Hello World")
      expect(result.events).toHaveLength(0)
    })
  })

  describe("claude-code", () => {
    it("extracts text from JSON output", () => {
      const input = '{"type": "result", "content": "Hello World"}'
      const result = parseExternalOutput(input, "claude-code")
      expect(result.finalOutput).toBe("Hello World")
    })

    it("falls back to raw output for non-JSON", () => {
      const input = "Plain text output"
      const result = parseExternalOutput(input, "claude-code")
      expect(result.finalOutput).toBe("Plain text output")
    })
  })

  describe("gemini", () => {
    it("returns trimmed output", () => {
      const result = parseExternalOutput("  Hello World  \n", "gemini")
      expect(result.finalOutput).toBe("Hello World")
      expect(result.events).toHaveLength(0)
    })
  })
})

describe("createNormalizedCheckpoint", () => {
  it("creates valid checkpoint structure", () => {
    const checkpoint = createNormalizedCheckpoint({
      jobId: "job-123",
      runId: "run-456",
      expertKey: "test-expert",
      expert: { key: "test-expert", name: "Test", version: "1.0.0" },
      output: "Hello World",
      runtime: "cursor",
    })

    expect(checkpoint.jobId).toBe("job-123")
    expect(checkpoint.runId).toBe("run-456")
    expect(checkpoint.status).toBe("completed")
    expect(checkpoint.stepNumber).toBe(1)
    expect(checkpoint.messages).toHaveLength(1)
    expect(checkpoint.messages[0].type).toBe("expertMessage")
    expect(checkpoint.metadata?.runtime).toBe("cursor")
    expect(checkpoint.metadata?.externalExecution).toBe(true)
  })
})

describe("createRuntimeInitEvent", () => {
  it("creates valid init event", () => {
    const event = createRuntimeInitEvent("job-123", "run-456", "Test Expert", "cursor")
    
    expect(event.type).toBe("initializeRuntime")
    expect(event.jobId).toBe("job-123")
    expect(event.runId).toBe("run-456")
    expect(event.expertName).toBe("Test Expert")
    expect(event.runtimeVersion).toBe("external:cursor")
  })
})

describe("createCompleteRunEvent", () => {
  it("creates valid complete event", () => {
    const checkpoint = createNormalizedCheckpoint({
      jobId: "job-123",
      runId: "run-456",
      expertKey: "test-expert",
      expert: { key: "test-expert", name: "Test", version: "1.0.0" },
      output: "Done",
      runtime: "cursor",
    })

    const event = createCompleteRunEvent(
      "job-123",
      "run-456",
      "test-expert",
      checkpoint,
      "Done",
    )

    expect(event.type).toBe("completeRun")
    expect(event.text).toBe("Done")
    expect(event.checkpoint.id).toBe(checkpoint.id)
  })
})
```

## Known Limitations

**Usage Tracking:** External runtimes do not expose token usage information. Checkpoints from external runtimes will have `usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }`. This means:
- Cost calculations will not include external runtime usage
- Job history usage statistics will show 0 for external runs

This is a known limitation documented in the multi-runtime feature.

## Documentation

No additional documentation needed.

## Acceptance Criteria

- [ ] `parseExternalOutput()` handles cursor, claude-code, gemini output
- [ ] `createNormalizedCheckpoint()` creates valid checkpoint structure
- [ ] `createRuntimeInitEvent()` creates valid initialization event
- [ ] `createCompleteRunEvent()` creates valid completion event
- [ ] Checkpoint schema supports `metadata` field
- [ ] `metadata.runtime` and `metadata.externalExecution` are stored
- [ ] All unit tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

- #01 Core schema `runtime` field

## Blocked By

- #01 Core schema `runtime` field

## Blocks

- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
