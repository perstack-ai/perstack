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
├── perstack/                       # perstack CLI tests (62 tests)
│   ├── run.test.ts                 # run command validation
│   ├── publish.test.ts             # publish command
│   ├── unpublish.test.ts           # unpublish command
│   ├── tag.test.ts                 # tag command
│   ├── status.test.ts              # status command
│   ├── multi-runtime.test.ts       # runtime selection, prerequisites
│   ├── delegate-chain.test.ts      # multi-level delegation
│   ├── parallel-delegate.test.ts   # parallel delegation
│   ├── mixed-tools.test.ts         # MCP + Delegate + Interactive
│   ├── special-tools.test.ts       # think, readPdfFile, readImageFile
│   ├── parallel-mcp.test.ts        # parallel MCP tools
│   ├── multi-modal.test.ts         # PDF and image reading
│   ├── continue-resume.test.ts     # --continue-job, --resume-from
│   └── graceful-recovery.test.ts   # error recovery
├── perstack-runtime/               # perstack-runtime CLI tests (10 tests)
│   ├── runtime-cli.test.ts         # version, help, execution
│   └── storage-behavior.test.ts    # storage differences between CLIs
├── lib/                            # Test utilities
│   ├── runner.ts                   # CLI and Expert execution
│   ├── event-parser.ts             # Runtime event parsing
│   └── assertions.ts               # Custom assertions
├── experts/                        # Expert definitions for tests
└── fixtures/                       # Test fixtures
```

## Test Categories

### perstack/ (62 tests)

Tests for `perstack` CLI: command validation, runtime selection, delegation, tool execution, state management.

### perstack-runtime/ (10 tests)

Tests for `perstack-runtime` CLI: version, help, run validation, expert execution, storage behavior.

## Complete Test List

### perstack/run.test.ts (6 tests)

1. should fail without arguments
2. should fail with only expert key
3. should fail for nonexistent expert
4. should fail with nonexistent config file
5. should fail when --resume-from is used without --continue or --continue-job
6. should reject invalid runtime name

### perstack/publish.test.ts (4 tests)

1. should output JSON payload for valid expert with --dry-run
2. should fail for nonexistent expert
3. should fail with nonexistent config file
4. should fail when no config in directory

### perstack/unpublish.test.ts (2 tests)

1. should fail without version
2. should fail without --force when version provided

### perstack/tag.test.ts (2 tests)

1. should fail without version
2. should fail without tags

### perstack/status.test.ts (3 tests)

1. should fail without version
2. should fail without status value
3. should fail with invalid status value

### perstack/multi-runtime.test.ts (7 tests)

1. should accept perstack runtime flag
2. should reject invalid runtime names
3. should show helpful error or succeed for cursor
4. should show helpful error for claude-code when unavailable
5. should show helpful error for gemini when unavailable
6. should use runtime from perstack.toml when --runtime not specified
7. should continue job and receive new completeRun event

### perstack/mixed-tools.test.ts (4 tests)

1. should generate 3 tool calls in priority order
2. should collect MCP result before delegate
3. should resume with delegate result and process interactive
4. should have all partial results after interactive stop

### perstack/parallel-mcp.test.ts (3 tests)

1. should execute multiple MCP tools in parallel
2. should resolve all MCP results before next step
3. should complete run successfully

### perstack/parallel-delegate.test.ts (5 tests)

1. should start run and call delegate
2. should have two delegations in single stopRunByDelegate event
3. should complete all delegations
4. should resume and complete coordinator
5. should continue after parallel delegation and complete with new query result

### perstack/special-tools.test.ts (7 tests)

1. should execute all 4 tools in parallel
2. should resolve all tool results together
3. should include think tool in resolved results
4. should include readPdfFile in resolved results
5. should include readImageFile in resolved results
6. should include web_search_exa in resolved results
7. should complete run successfully

### perstack/multi-modal.test.ts (2 tests)

1. should read and summarize PDF content about perstack github
2. should read and describe image content about perstack demo

### perstack/delegate-chain.test.ts (3 tests)

1. should delegate through chain
2. should have multiple delegation levels
3. should return through chain and complete

### perstack/continue-resume.test.ts (4 tests)

1. should stop at interactive tool and get job ID
2. should continue job with --continue-job
3. should complete after continue
4. should capture checkpoint for resume

### perstack/graceful-recovery.test.ts (2 tests)

1. should recover from file not found error and complete successfully
2. should fail with clear message for nonexistent delegate

### perstack-runtime/runtime-cli.test.ts (8 tests)

1. should show version
2. should show help
3. should show run command help
4. should fail without arguments
5. should fail with only expert key
6. should fail for nonexistent expert
7. should fail with nonexistent config file
8. should run expert and output JSON events

### perstack-runtime/storage-behavior.test.ts (2 tests)

1. should create storage files when running expert
2. should NOT create new storage files when running expert

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

| CLI                | Package             | Storage                           | Use Case                     |
| ------------------ | ------------------- | --------------------------------- | ---------------------------- |
| `perstack`         | `packages/perstack` | Creates files in `perstack/jobs/` | Primary user-facing CLI      |
| `perstack-runtime` | `packages/runtime`  | No storage (JSON events only)     | Standalone runtime execution |

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

