---
title: "Add: GeminiAdapter for Gemini CLI integration"
labels: ["multi-runtime", "runtime", "adapter"]
---

## Overview

Implement `GeminiAdapter` to enable Expert execution via Gemini CLI (`gemini`).

## Background

Gemini CLI provides a CLI for programmatic agent execution:

```bash
gemini -p "prompt"
```

**Key characteristics:**
- Gemini models only (no multi-vendor)
- No MCP support
- General purpose (not coding-focused)
- Built-in file and shell capabilities

See: [Gemini CLI Headless](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html)

## Implementation

### 1. Create GeminiAdapter

**File:** `packages/runtime/src/adapters/gemini-adapter.ts` (new file)

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

export class GeminiAdapter implements RuntimeAdapter {
  readonly name = "gemini"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    // Check if gemini CLI is installed
    try {
      const result = await this.execCommand(["gemini", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Gemini CLI is not installed.",
            helpUrl: "https://google-gemini.github.io/gemini-cli/docs/getting-started/installation.html",
          },
        }
      }
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Gemini CLI is not installed.",
          helpUrl: "https://google-gemini.github.io/gemini-cli/docs/getting-started/installation.html",
        },
      }
    }

    // Check for GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      return {
        ok: false,
        error: {
          type: "auth-missing",
          message: "GEMINI_API_KEY environment variable is not set.",
          helpUrl: "https://google-gemini.github.io/gemini-cli/docs/getting-started/authentication.html",
        },
      }
    }

    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    // Build instruction with delegate context
    const instruction = expert.instruction

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

    // Execute gemini CLI
    const result = await this.executeGeminiCli(prompt, setting.timeout)

    // Parse output and create normalized events
    const { events, finalOutput } = parseExternalOutput(result.stdout, "gemini")

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
      runtime: "gemini",
    })

    return { checkpoint, events }
  }

  private buildPrompt(instruction: string, query?: string): string {
    let prompt = `## Instructions\n${instruction}`
    if (query) {
      prompt += `\n\n## User Request\n${query}`
    }
    return prompt
  }

  private async executeGeminiCli(
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""

      const proc = spawn("gemini", ["-p", prompt], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      })

      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`Gemini CLI timed out after ${timeout}ms`))
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
import { GeminiAdapter } from "./gemini-adapter.js"

const adapters: Partial<Record<RuntimeName, () => RuntimeAdapter>> = {
  perstack: () => new PerstackAdapter(),
  cursor: () => new CursorAdapter(),
  "claude-code": () => new ClaudeCodeAdapter(),
  gemini: () => new GeminiAdapter(),
}
```

### 3. Export GeminiAdapter

**File:** `packages/runtime/src/adapters/index.ts`

```typescript
export { GeminiAdapter } from "./gemini-adapter.js"
```

## Affected Files

| File                                              | Change                            |
| ------------------------------------------------- | --------------------------------- |
| `packages/runtime/src/adapters/gemini-adapter.ts` | New: GeminiAdapter implementation |
| `packages/runtime/src/adapters/factory.ts`        | Register GeminiAdapter            |
| `packages/runtime/src/adapters/index.ts`          | Export GeminiAdapter              |

## Testing

### Unit Tests

Create `packages/runtime/src/adapters/gemini-adapter.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { GeminiAdapter } from "./gemini-adapter.js"

describe("GeminiAdapter", () => {
  it("has correct name", () => {
    const adapter = new GeminiAdapter()
    expect(adapter.name).toBe("gemini")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged when no delegates", () => {
      const adapter = new GeminiAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["gemini"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })

    it("appends delegate context when delegates exist", () => {
      const adapter = new GeminiAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: ["helper-expert"],
        tags: [],
        runtime: ["gemini"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toContain("## Available Delegates")
      expect(config.instruction).toContain("- helper-expert")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when GEMINI_API_KEY not set", async () => {
      const originalKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY
      
      const adapter = new GeminiAdapter()
      const result = await adapter.checkPrerequisites()
      
      // Restore
      if (originalKey) process.env.GEMINI_API_KEY = originalKey
      
      if (!result.ok) {
        expect(result.error.type).toMatch(/cli-not-found|auth-missing/)
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })
})
```

### E2E Tests (Manual)

```bash
# Prerequisites: gemini CLI installed, GEMINI_API_KEY set
npx perstack run test-expert "Write hello.txt with 'Hello World'" \
  --runtime gemini \
  --config ./e2e/experts/special-tools.toml
```

## Documentation

Already documented in:
- `docs/content/using-experts/multi-runtime.mdx` (Gemini section)
- `docs/content/references/cli.mdx` (--runtime option)

## Acceptance Criteria

- [ ] `GeminiAdapter` implements `RuntimeAdapter` interface
- [ ] Prerequisites check validates `gemini` installation
- [ ] Prerequisites check validates `GEMINI_API_KEY`
- [ ] Expert instruction and query are passed via `-p`
- [ ] Delegate context is appended to instruction
- [ ] Output is parsed into Perstack event format
- [ ] Checkpoint is created with correct structure
- [ ] Unit tests pass
- [ ] `pnpm typecheck` passes

## Dependencies

- #03 RuntimeAdapter interface
- #04 Integrate adapters into CLI
- #08 Event Normalization

## Blocked By

- #03 RuntimeAdapter interface
- #04 Integrate adapters into CLI
- #08 Event Normalization

## Blocks

- #10 E2E Tests for Multi-Runtime
