---
title: "Add: E2E tests for multi-runtime support"
labels: ["multi-runtime", "test"]
---

## Overview

Add E2E tests to verify multi-runtime functionality, focusing on CLI option handling and adapter dispatching.

## Background

E2E tests for external runtimes are challenging because:
- External CLIs (cursor-agent, claude, gemini) may not be installed in CI
- Authentication requirements vary by runtime
- Execution time and costs differ

Strategy:
1. **Fully automated tests**: Test CLI option parsing and error handling
2. **Skip-if-unavailable tests**: Test actual execution when runtime is available
3. **Manual verification**: Document manual test procedures for full coverage

## Implementation

### 1. Create Multi-Runtime Test File

**File:** `e2e/multi-runtime.test.ts` (new file)

```typescript
import { describe, expect, it } from "vitest"
import { runCli, runExpert } from "./lib/runner.js"

describe("multi-runtime CLI", () => {
  describe("--runtime option parsing", () => {
    it("should accept valid runtime names", async () => {
      // Test that the option is parsed (even if runtime unavailable)
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "perstack",
        "special-tools",
        "echo test",
      ])
      // Should not fail due to invalid option
      // May fail for other reasons (e.g., API key, timeout)
      expect(result.stderr).not.toContain("Invalid option")
    })

    it("should reject invalid runtime names", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "invalid-runtime",
        "special-tools",
        "echo test",
      ])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("invalid")
    })
  })

  describe("unavailable runtime handling", () => {
    it("should show helpful error for cursor when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "cursor",
        "special-tools",
        "echo test",
      ])
      
      // Should either work (if installed) or show helpful error
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not available|not installed|prerequisites/)
      }
    })

    it("should show helpful error for claude-code when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "claude-code",
        "special-tools",
        "echo test",
      ])
      
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not available|not installed|prerequisites/)
      }
    })

    it("should show helpful error for gemini when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "gemini",
        "special-tools",
        "echo test",
      ])
      
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not available|not installed|prerequisites/)
      }
    })
  })

  describe("perstack runtime (default)", () => {
    it("should execute with perstack runtime when not specified", async () => {
      const result = await runExpert("special-tools", "echo hello", {
        configPath: "./e2e/experts/special-tools.toml",
        timeout: 120000,
      })
      
      expect(result.exitCode).toBe(0)
      // Verify perstack runtime events
      const initEvent = result.events.find((e) => e.type === "initializeRuntime")
      expect(initEvent).toBeDefined()
      // @ts-ignore
      expect(initEvent?.runtimeVersion).not.toContain("external:")
    })

    it("should execute with explicit perstack runtime", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "perstack",
        "special-tools",
        "echo hello",
      ], { timeout: 120000 })
      
      expect(result.exitCode).toBe(0)
    })
  })
})
```

### 2. Create Mock Adapter for Testing

**File:** `packages/runtime/src/adapters/mock-adapter.ts` (new file)

Mock adapter enables E2E testing without external CLI dependencies:

```typescript
import type { Expert } from "@perstack/core"
import type {
  RuntimeAdapter,
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  RuntimeExpertConfig,
} from "./types.js"
import { createNormalizedCheckpoint } from "./output-parser.js"

export type MockAdapterOptions = {
  name: string
  shouldFail?: boolean
  failureMessage?: string
  mockOutput?: string
  delay?: number
}

export class MockAdapter implements RuntimeAdapter {
  readonly name: string
  private options: MockAdapterOptions

  constructor(options: MockAdapterOptions) {
    this.name = options.name
    this.options = options
  }

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    if (this.options.shouldFail) {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: this.options.failureMessage ?? "Mock failure",
        },
      }
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, eventListener } = params
    const expert = setting.experts[setting.expertKey]
    if (this.options.delay) {
      await new Promise((r) => setTimeout(r, this.options.delay))
    }
    const output = this.options.mockOutput ?? `Mock output from ${this.name}`
    const checkpoint = createNormalizedCheckpoint({
      jobId: setting.jobId,
      runId: setting.runId,
      expertKey: setting.expertKey,
      expert,
      output,
      runtime: this.name as any,
    })
    return { checkpoint, events: [] }
  }
}
```

**File:** `packages/runtime/src/adapters/index.ts` (update)

```typescript
export { MockAdapter, type MockAdapterOptions } from "./mock-adapter.js"
```

### 3. Create Multi-Runtime Expert Definition

**File:** `e2e/experts/multi-runtime.toml` (new file)

```toml
model = "claude-sonnet-4-5"
temperature = 0.3

[provider]
providerName = "anthropic"

[experts."multi-runtime-test"]
version = "1.0.0"
runtime = ["perstack", "cursor", "claude-code"]
description = "Test expert for multi-runtime execution"
instruction = """
You are a test expert. When asked to perform a task:
1. Acknowledge the request
2. Complete the task using available tools
3. Report the result

Keep responses brief.
"""

[experts."multi-runtime-test".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["attemptCompletion", "executeShellCommand"]
```

### 3. Add Manual Test Documentation

**File:** `e2e/MANUAL-MULTI-RUNTIME.md` (new file)

```markdown
# Manual Multi-Runtime Tests

These tests require external runtime CLIs to be installed and authenticated.

## Prerequisites

### Cursor
```bash
# Install
curl https://cursor.com/install -fsS | bash

# Set API key
export CURSOR_API_KEY=your_key
```

### Claude Code
```bash
# Install
npm install -g @anthropic-ai/claude-code

# Authenticate
claude
```

### Gemini
```bash
# Install (varies by platform)
# See: https://google-gemini.github.io/gemini-cli/

# Set API key
export GEMINI_API_KEY=your_key
```

## Test Cases

### 1. Basic Execution

```bash
# Cursor
npx perstack run multi-runtime-test "Write hello.txt with 'Hello from Cursor'" \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime cursor

# Claude Code
npx perstack run multi-runtime-test "Write hello.txt with 'Hello from Claude'" \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime claude-code

# Gemini
npx perstack run multi-runtime-test "Write hello.txt with 'Hello from Gemini'" \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime gemini
```

**Expected**: Each creates hello.txt with appropriate content.

### 2. Checkpoint Storage

```bash
# Run with cursor
npx perstack run multi-runtime-test "List files" \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime cursor

# Check checkpoint
ls perstack/jobs/
cat perstack/jobs/*/checkpoints/*.json | jq '.metadata.runtime'
```

**Expected**: Checkpoint has `metadata.runtime: "cursor"`.

### 3. TUI Display

```bash
npx perstack start multi-runtime-test \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime cursor
```

**Expected**: TUI shows "Runtime: cursor" in config panel.

### 4. Prerequisites Error

```bash
# Unset API key and test
unset CURSOR_API_KEY
npx perstack run multi-runtime-test "test" \
  --config ./e2e/experts/multi-runtime.toml \
  --runtime cursor
```

**Expected**: Clear error message about missing CURSOR_API_KEY with help URL.
```

### 4. Update E2E README

**File:** `e2e/README.md`

Add section:

```markdown
### Multi-Runtime Tests

| File                  | Tests | Coverage                                    |
| --------------------- | ----- | ------------------------------------------- |
| multi-runtime.test.ts | 6     | CLI option parsing, error handling, default |

**Note**: Full multi-runtime testing requires external CLI installations.
See `MANUAL-MULTI-RUNTIME.md` for manual test procedures.
```

## Affected Files

| File                                            | Change                         |
| ----------------------------------------------- | ------------------------------ |
| `packages/runtime/src/adapters/mock-adapter.ts` | New: Mock adapter for testing  |
| `packages/runtime/src/adapters/index.ts`        | Export MockAdapter             |
| `e2e/multi-runtime.test.ts`                     | New: Automated tests           |
| `e2e/experts/multi-runtime.toml`                | New: Test expert definition    |
| `e2e/MANUAL-MULTI-RUNTIME.md`                   | New: Manual test documentation |
| `e2e/README.md`                                 | Add multi-runtime section      |

## Testing

Run automated tests:

```bash
pnpm build
pnpm test:e2e -- multi-runtime.test.ts
```

## Acceptance Criteria

- [ ] CLI option parsing tests pass
- [ ] Invalid runtime name rejected with clear error
- [ ] Unavailable runtime shows helpful error message
- [ ] Perstack runtime works with and without `--runtime` flag
- [ ] Manual test documentation complete
- [ ] E2E README updated
- [ ] All automated tests pass

## Dependencies

- #04 Integrate adapters into CLI
- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
- #08 Event Normalization

## Blocked By

- #04 Integrate adapters into CLI

## Blocks

- #12 Documentation Update (completion)
