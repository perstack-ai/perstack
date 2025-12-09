---
title: "Add: ClaudeCodeAdapter for Claude Code CLI integration"
labels: ["multi-runtime", "runtime", "adapter"]
---

## Overview

Implement `ClaudeCodeAdapter` to enable Expert execution via Claude Code CLI (`claude`).

## Background

Claude Code provides a CLI for programmatic agent execution:

```bash
claude -p "prompt" --append-system-prompt "instruction"
```

**Key characteristics:**
- Claude models only (no multi-vendor)
- MCP configuration via `claude mcp` (not injectable from perstack.toml)
- Deep reasoning capabilities
- File read/write and shell commands built-in

See: [Claude Code CLI Reference](https://docs.claude.com/en/docs/claude-code/cli-usage)

## Implementation

### 1. Create ClaudeCodeAdapter

**File:** `packages/runtime/src/adapters/claude-code-adapter.ts` (new file)

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

export class ClaudeCodeAdapter implements RuntimeAdapter {
  readonly name = "claude-code"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    // Check if claude CLI is installed
    try {
      const result = await this.execCommand(["claude", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Claude Code CLI is not installed.",
            helpUrl: "https://docs.claude.com/en/docs/claude-code/installation",
          },
        }
      }
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Claude Code CLI is not installed.",
          helpUrl: "https://docs.claude.com/en/docs/claude-code/installation",
        },
      }
    }

    // Check authentication by attempting a simple status command
    try {
      const result = await this.execCommand(["claude", "status"])
      if (result.exitCode !== 0 && result.stderr.includes("not authenticated")) {
        return {
          ok: false,
          error: {
            type: "auth-missing",
            message: "Claude Code CLI is not authenticated. Run 'claude' to authenticate.",
            helpUrl: "https://docs.claude.com/en/docs/claude-code/getting-started",
          },
        }
      }
    } catch {
      // Status check failed, but might still work
    }

    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    // Build system prompt with instruction and delegate context
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

    // Build prompt
    const prompt = setting.input.text ?? ""

    // Execute claude CLI
    const result = await this.executeClaudeCli(config.instruction, prompt, setting.timeout)

    // Parse output and create normalized events
    const { events, finalOutput } = parseExternalOutput(result.stdout, "claude-code")

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
      runtime: "claude-code",
    })

    return { checkpoint, events }
  }

  private async executeClaudeCli(
    systemPrompt: string,
    prompt: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""

      const args = ["-p", prompt]
      if (systemPrompt) {
        args.push("--append-system-prompt", systemPrompt)
      }

      const proc = spawn("claude", args, {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      })

      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`Claude Code timed out after ${timeout}ms`))
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
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"

const adapters: Partial<Record<RuntimeName, () => RuntimeAdapter>> = {
  perstack: () => new PerstackAdapter(),
  cursor: () => new CursorAdapter(),
  "claude-code": () => new ClaudeCodeAdapter(),
  // ...
}
```

### 3. Export ClaudeCodeAdapter

**File:** `packages/runtime/src/adapters/index.ts`

```typescript
export { ClaudeCodeAdapter } from "./claude-code-adapter.js"
```

## Affected Files

| File                                                   | Change                                |
| ------------------------------------------------------ | ------------------------------------- |
| `packages/runtime/src/adapters/claude-code-adapter.ts` | New: ClaudeCodeAdapter implementation |
| `packages/runtime/src/adapters/factory.ts`             | Register ClaudeCodeAdapter            |
| `packages/runtime/src/adapters/index.ts`               | Export ClaudeCodeAdapter              |

## Testing

### Unit Tests

Create `packages/runtime/src/adapters/claude-code-adapter.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"

describe("ClaudeCodeAdapter", () => {
  it("has correct name", () => {
    const adapter = new ClaudeCodeAdapter()
    expect(adapter.name).toBe("claude-code")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged when no delegates", () => {
      const adapter = new ClaudeCodeAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["claude-code"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })

    it("appends delegate context when delegates exist", () => {
      const adapter = new ClaudeCodeAdapter()
      const expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: ["helper-expert"],
        tags: [],
        runtime: ["claude-code"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toContain("## Available Delegates")
      expect(config.instruction).toContain("- helper-expert")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when claude CLI not installed", async () => {
      const adapter = new ClaudeCodeAdapter()
      const result = await adapter.checkPrerequisites()
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
# Prerequisites: claude CLI installed and authenticated
npx perstack run test-expert "Write hello.txt with 'Hello World'" \
  --runtime claude-code \
  --config ./e2e/experts/special-tools.toml
```

## Documentation

Already documented in:
- `docs/content/using-experts/multi-runtime.mdx` (Claude Code section)
- `docs/content/references/cli.mdx` (--runtime option)

## Acceptance Criteria

- [ ] `ClaudeCodeAdapter` implements `RuntimeAdapter` interface
- [ ] Prerequisites check validates `claude` installation
- [ ] Prerequisites check validates authentication
- [ ] Expert instruction is passed via `--append-system-prompt`
- [ ] User query is passed via `-p`
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
