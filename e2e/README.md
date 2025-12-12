# E2E Tests

End-to-end tests for Perstack CLI and runtime.

## Prerequisites

```bash
pnpm build
```

## Running Tests

```bash
# Run all E2E tests (parallel execution)
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- run.test.ts

# Run tests matching pattern
pnpm test:e2e -- --testNamePattern "publish"
```

## Test Structure

```
e2e/
├── lib/                        # Test utilities
│   ├── runner.ts               # CLI and Expert execution
│   ├── event-parser.ts         # Runtime event parsing
│   └── assertions.ts           # Custom assertions
├── experts/                    # Expert definitions for tests
│   ├── cli-commands.toml       # CLI command tests (publish, etc.)
│   ├── global-runtime.toml     # Global runtime config
│   ├── mixed-tools.toml        # MCP + Delegate + Interactive
│   ├── parallel-mcp.toml       # Parallel MCP calls
│   ├── parallel-delegate.toml  # Parallel delegation
│   ├── delegate-chain.toml     # Delegation chain
│   ├── continue-resume.toml    # Continue/resume functionality
│   ├── special-tools.toml      # Special tools parallel execution
│   ├── error-handling.toml     # Error handling tests
│   └── multi-modal.toml        # PDF and image reading
├── fixtures/                   # Test fixtures
│   ├── test.pdf                # PDF file for multi-modal tests
│   └── test.gif                # GIF image for multi-modal tests
├── run.test.ts                 # perstack CLI run command validation
├── runtime-cli.test.ts         # perstack-runtime CLI
├── multi-runtime.test.ts       # Multi-runtime support
├── storage-behavior.test.ts    # Storage behavior verification
├── publish.test.ts             # CLI publish command
├── unpublish.test.ts           # CLI unpublish command
├── tag.test.ts                 # CLI tag command
├── status.test.ts              # CLI status command
├── mixed-tools.test.ts         # Mixed tool calls (MCP + Delegate + Interactive)
├── parallel-mcp.test.ts        # Parallel MCP tool execution
├── parallel-delegate.test.ts   # Parallel delegation
├── special-tools.test.ts       # Special tools (think, readPdfFile, readImageFile)
├── multi-modal.test.ts         # PDF and image content verification
├── delegate-chain.test.ts      # Expert delegation chain
├── graceful-recovery.test.ts   # Error recovery
└── continue-resume.test.ts     # --continue-job and --resume-from
```

## Test Categories

### perstack CLI Commands

Tests for `perstack` CLI argument validation and error handling.

| File              | Tests | Coverage                                           |
| ----------------- | ----- | -------------------------------------------------- |
| run.test.ts       | 6     | Missing args, nonexistent expert, invalid config   |
| publish.test.ts   | 4     | dry-run success, nonexistent expert, config errors |
| unpublish.test.ts | 2     | Missing version, missing --force                   |
| tag.test.ts       | 2     | Missing version, missing tags                      |
| status.test.ts    | 3     | Missing version/status, invalid status             |

### perstack-runtime CLI

Tests for the standalone `perstack-runtime` CLI.

| File                | Tests | Coverage                               |
| ------------------- | ----- | -------------------------------------- |
| runtime-cli.test.ts | 8     | Version, help, run validation, execution |

### Multi-Runtime Support

Tests for runtime selection and external runtime prerequisites.

| File                 | Tests | Coverage                                        |
| -------------------- | ----- | ----------------------------------------------- |
| multi-runtime.test.ts | 7     | Runtime flags, prerequisites, continue with runtime |

### Storage Behavior

Tests verifying the storage differences between CLIs.

| File                    | Tests | Coverage                                    |
| ----------------------- | ----- | ------------------------------------------- |
| storage-behavior.test.ts | 2     | perstack stores files, perstack-runtime does not |

### Runtime Features

Tests for parallel tool calls, delegation, and state management.

| File                     | Tests | Coverage                                             |
| ------------------------ | ----- | ---------------------------------------------------- |
| mixed-tools.test.ts      | 4     | MCP + Delegate + Interactive in single response      |
| parallel-mcp.test.ts     | 3     | Parallel MCP tool execution                          |
| parallel-delegate.test.ts | 5     | Parallel delegation                                  |
| special-tools.test.ts    | 7     | think, readPdfFile, readImageFile parallel execution |
| multi-modal.test.ts      | 2     | PDF and image content reading verification           |
| delegate-chain.test.ts   | 3     | Multi-level delegation                               |
| continue-resume.test.ts  | 4     | --continue-job, --resume-from                        |
| graceful-recovery.test.ts | 2     | Tool error recovery, invalid config handling         |

## Writing Tests

### CLI Command Tests

```typescript
import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI command", () => {
  it("should fail with invalid args", async () => {
    const result = await runCli(["command", "invalid-arg"])
    expect(result.exitCode).toBe(1)
  })
})
```

### Runtime Tests

```typescript
import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { type RunResult, runExpert } from "./lib/runner.js"

describe("Runtime feature", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert("expert-key", "query", {
      configPath: "./e2e/experts/your-expert.toml",
      timeout: 180000,
    })
  }, 200000)

  it("should emit expected events", () => {
    expect(
      assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed,
    ).toBe(true)
  })
})
```

## Architecture Notes

### Two CLIs

Perstack provides two CLI entry points with different purposes:

| CLI | Package | Storage | Use Case |
| --- | ------- | ------- | -------- |
| `perstack` | `packages/perstack` | Creates files in `perstack/jobs/` | Primary user-facing CLI |
| `perstack-runtime` | `packages/runtime` | No storage (JSON events only) | Standalone runtime execution |

The `perstack` CLI uses `@perstack/runner` to dispatch to adapters. Storage (checkpoints, events, jobs) is handled by the runner, not by individual runtimes.

The `perstack-runtime` CLI is a lightweight wrapper that executes experts and outputs JSON events to stdout without any storage. This makes it suitable for integration with external systems.

### Runtime Adapters

All runtimes (perstack, cursor, claude-code, gemini) are treated equally via the adapter pattern:

- Each adapter implements `RuntimeAdapter` interface
- `@perstack/runner` dispatches to adapters uniformly
- Storage is handled by runner, not by adapters

## Notes

- Tests run in parallel via vitest
- Runtime tests require API keys (set in `.env.local`)
- TUI-based commands (`start`) are excluded from E2E tests
- API-calling tests (actual publish, unpublish) require registry access and are not included
- External runtime tests (cursor, claude-code, gemini) pass regardless of CLI availability

## Multi-Modal Test Verification (IMPORTANT)

**Every time E2E tests are run, manually verify the multi-modal test output.**

The `multi-modal.test.ts` outputs the LLM's summary of PDF and image files. Check the console output to ensure:

1. **PDF Summary**: Should describe perstack GitHub README content (features, license, etc.)
2. **Image Description**: Should describe terminal/CLI interface content

These logs confirm that `readPdfFile` and `readImageFile` tools are correctly reading file contents. Automated assertions check for keywords, but human review ensures the content is actually understood.

