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
├── lib/                      # Test utilities
│   ├── runner.ts             # CLI and Expert execution
│   ├── event-parser.ts       # Runtime event parsing
│   └── assertions.ts         # Custom assertions
├── experts/                  # Expert definitions for tests
│   ├── mixed-tools.toml      # MCP + Delegate + Interactive
│   ├── parallel-mcp.toml     # Parallel MCP calls
│   ├── delegate-chain.toml   # Delegation chain
│   └── continue-resume.toml  # Continue/resume functionality
├── run.test.ts               # CLI run command
├── publish.test.ts           # CLI publish command
├── unpublish.test.ts         # CLI unpublish command
├── tag.test.ts               # CLI tag command
├── status.test.ts            # CLI status command
├── mixed-tools.test.ts       # Mixed tool calls (MCP + Delegate + Interactive)
├── parallel-mcp.test.ts      # Parallel MCP tool execution
├── delegate-chain.test.ts    # Expert delegation chain
└── continue-resume.test.ts   # --continue-run and --resume-from
```

## Test Categories

### CLI Commands

Tests for CLI argument validation and error handling.

| File | Tests | Coverage |
|------|-------|----------|
| run.test.ts | 4 | Missing args, nonexistent expert, invalid config |
| publish.test.ts | 4 | dry-run success, nonexistent expert, config errors |
| unpublish.test.ts | 2 | Missing version, missing --force |
| tag.test.ts | 2 | Missing version, missing tags |
| status.test.ts | 3 | Missing version/status, invalid status |

### Runtime Features

Tests for parallel tool calls, delegation, and state management.

| File | Tests | Coverage |
|------|-------|----------|
| mixed-tools.test.ts | 4 | MCP + Delegate + Interactive in single response |
| parallel-mcp.test.ts | 3 | Parallel MCP tool execution |
| delegate-chain.test.ts | 3 | Multi-level delegation |
| continue-resume.test.ts | 4 | --continue-run, --resume-from |

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

## Notes

- Tests run in parallel via vitest
- Runtime tests require API keys (set in `.env.local`)
- TUI-based commands (`start`) are excluded from E2E tests
- API-calling tests (actual publish, unpublish) require registry access and are not included

