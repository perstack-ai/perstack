---
title: "Add: CursorAdapter for Cursor CLI integration"
labels: ["multi-runtime", "runtime", "adapter"]
---

## Overview

Implement `CursorAdapter` to enable Expert execution via Cursor CLI headless mode (`cursor-agent`).

## Background

Cursor provides a headless CLI for programmatic agent execution:

```bash
cursor-agent -p "prompt" --force
```

**Key characteristics:**
- Multi-vendor model support (uses Cursor's model settings)
- Built-in codebase indexing
- No MCP support in headless mode
- File read/write and shell commands via `--force`

See: [Cursor CLI Headless Documentation](https://docs.cursor.com/en/cli/headless)

## Implementation

### 1. Create CursorAdapter

**File:** `packages/runtime/src/adapters/cursor-adapter.ts` (new file)

```typescript
import { spawn } from "node:child_process"
import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import type {
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  RuntimeAdapter,
  RuntimeExpertConfig,
} from "./types.js"
import { parseExternalOutput, createNormalizedCheckpoint } from "./output-parser.js"

export class CursorAdapter implements RuntimeAdapter {
  readonly name = "cursor"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    // Check if cursor-agent is installed
    try {
      const result = await this.execCommand(["cursor-agent", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Cursor CLI (cursor-agent) is not installed.",
            helpUrl: "https://docs.cursor.com/en/cli/headless",
          },
        }
      }
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Cursor CLI (cursor-agent) is not installed.",
          helpUrl: "https://docs.cursor.com/en/cli/headless",
        },
      }
    }

    // Check for CURSOR_API_KEY
    if (!process.env.CURSOR_API_KEY) {
      return {
        ok: false,
        error: {
          type: "auth-missing",
          message: "CURSOR_API_KEY environment variable is not set.",
          helpUrl: "https://docs.cursor.com/en/cli/headless#authentication",
        },
      }
    }

    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    // Build instruction with delegate context
    let instruction = expert.instruction

    // Add delegate context if available
    if (expert.delegates.length > 0) {
      const delegateInfo = expert.delegates
        .map((key) => `- ${key}`)
        .join("\n")
      instruction += `\n\n## Available Delegates\n${delegateInfo}\n\nWhen you need specialized help, consider the above delegates' capabilities.`
    }

    return { instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, eventListener } = params
    const expert = setting.experts[setting.expertKey]
    if (!expert) {
      throw new Error(`Expert "${setting.expertKey}" not found`)
    }

    const config = this.convertExpert(expert)

    // Build prompt with instruction and query
    const prompt = this.buildPrompt(config.instruction, setting.input.text)

    // Execute cursor-agent
    const result = await this.executeCursorAgent(prompt, setting.timeout)

    // Parse output and create normalized events
    const { events, finalOutput } = parseExternalOutput(result.stdout, "cursor")

    // Emit events
    for (const event of events) {
      eventListener?.(event)
    }

    // Create checkpoint
    const checkpoint = createNormalizedCheckpoint({
      jobId: setting.jobId,
      runId: setting.runId,
      expertKey: setting.expertKey,
      expert,
      output: finalOutput,
      runtime: "cursor",
    })

    return { checkpoint, events }
  }

  private buildPrompt(instruction: string, query?: string): string {
    let prompt = instruction
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  private async executeCursorAgent(
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""

      const proc = spawn("cursor-agent", ["-p", prompt, "--force"], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      })

      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`Cursor agent timed out after ${timeout}ms`))
      }, timeout)

      proc.stdout.on("data", (data) => {
        stdout += data.toString()
      })

      proc.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      proc.on("close", (code) => {
        clearTimeout(timer)
        resolve({ stdout, stderr, exitCode: code ?? 0 })
      })

      proc.on("error", (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  private async execCommand(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const [cmd, ...cmdArgs] = args
      const proc = spawn(cmd, cmdArgs, { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] })
      let stdout = ""
      let stderr = ""
      proc.stdout.on("data", (data) => { stdout += data.toString() })
      proc.stderr.on("data", (data) => { stderr += data.toString() })
      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 127 })
      })
      proc.on("error", () => {
        resolve({ stdout: "", stderr: "", exitCode: 127 })
      })
    })
  }
}
```

### 2. Register in Factory

**File:** `packages/runtime/src/adapters/factory.ts`

```typescript
import { CursorAdapter } from "./cursor-adapter.js"

const adapters: Partial<Record<RuntimeName, () => RuntimeAdapter>> = {
  perstack: () => new PerstackAdapter(),
  cursor: () => new CursorAdapter(),
  // ...
}
```

### 3. Export CursorAdapter

**File:** `packages/runtime/src/adapters/index.ts`

```typescript
export { CursorAdapter } from "./cursor-adapter.js"
```

## Affected Files

| File                                              | Change                            |
| ------------------------------------------------- | --------------------------------- |
| `packages/runtime/src/adapters/cursor-adapter.ts` | New: CursorAdapter implementation |
| `packages/runtime/src/adapters/factory.ts`        | Register CursorAdapter            |
| `packages/runtime/src/adapters/index.ts`          | Export CursorAdapter              |

## Testing

### Unit Tests

Create `packages/runtime/src/adapters/cursor-adapter.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest"
import { CursorAdapter } from "./cursor-adapter.js"

describe("CursorAdapter", () => {
  it("has correct name", () => {
    const adapter = new CursorAdapter()
    expect(adapter.name).toBe("cursor")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged when no delegates", () => {
      const adapter = new CursorAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["cursor"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })

    it("appends delegate context when delegates exist", () => {
      const adapter = new CursorAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: ["helper-expert"],
        tags: [],
        runtime: ["cursor"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toContain("## Available Delegates")
      expect(config.instruction).toContain("- helper-expert")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when cursor-agent not installed", async () => {
      const adapter = new CursorAdapter()
      // This test will fail in CI where cursor-agent is not installed
      // That's expected behavior
      const result = await adapter.checkPrerequisites()
      // Either passes (if installed) or fails with specific error
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })
})
```

### E2E Tests (Manual)

E2E tests for external runtimes require actual CLI installations and are run manually:

```bash
# Prerequisites: cursor-agent installed, CURSOR_API_KEY set
npx perstack run test-expert "Write hello.txt with 'Hello World'" \
  --runtime cursor \
  --config ./e2e/experts/special-tools.toml
```

## Documentation

Already documented in:
- `docs/content/using-experts/multi-runtime.mdx` (Cursor section)
- `docs/content/references/cli.mdx` (--runtime option)

## Acceptance Criteria

- [ ] `CursorAdapter` implements `RuntimeAdapter` interface
- [ ] Prerequisites check validates `cursor-agent` installation
- [ ] Prerequisites check validates `CURSOR_API_KEY`
- [ ] Expert instruction is passed to `cursor-agent -p`
- [ ] Delegate context is appended to instruction
- [ ] `--force` flag is used for file/shell operations
- [ ] Output is parsed into Perstack event format
- [ ] Checkpoint is created with correct structure
- [ ] Unit tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

- #03 RuntimeAdapter interface
- #04 Integrate adapters into CLI
- #08 Event Normalization (for `parseExternalOutput`)

## Blocked By

- #03 RuntimeAdapter interface
- #04 Integrate adapters into CLI
- #08 Event Normalization

## Blocks

- #10 E2E Tests for Multi-Runtime
