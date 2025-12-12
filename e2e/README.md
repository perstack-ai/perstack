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
pnpm test:e2e -- --testNamePattern "delegate"
```

## Test Structure

```
e2e/
├── perstack-cli/                  # perstack CLI tests
│   ├── continue.test.ts           # Continue job
│   ├── delegate.test.ts           # Delegate to expert
│   ├── interactive.test.ts        # Interactive input (with delegation)
│   ├── runtime-selection.test.ts  # Select runtime
│   ├── publish.test.ts            # Publish expert
│   └── validation.test.ts         # CLI validation
├── perstack-runtime/              # perstack-runtime CLI tests
│   ├── run.test.ts                # Run expert
│   ├── delegate.test.ts           # Delegate (removed - needs runner)
│   ├── interactive.test.ts        # Interactive input (simple)
│   ├── error-handling.test.ts     # Error handling
│   ├── storage-behavior.test.ts   # Storage behavior
│   └── validation.test.ts         # CLI validation
├── lib/                           # Test utilities
│   ├── runner.ts                  # CLI and Expert execution
│   ├── event-parser.ts            # Runtime event parsing
│   └── assertions.ts              # Custom assertions
├── experts/                       # Expert definitions for tests
└── fixtures/                      # Test fixtures
```

## Test Categories by Use Case

### perstack-cli/

| Use Case | File | Tests |
|----------|------|-------|
| **Continue job** | continue.test.ts | Continue from interactive stop, continue from delegation stop |
| **Delegate to expert** | delegate.test.ts | Chain delegation, parallel delegation |
| **Interactive input** | interactive.test.ts | Mixed tools with interactive (MCP + delegate + askUser) |
| **Select runtime** | runtime-selection.test.ts | CLI option, external runtimes, config file |
| **Publish expert** | publish.test.ts | Preview, unpublish, tag, status |
| **CLI validation** | validation.test.ts | Argument validation, config validation |

### perstack-runtime/

| Use Case | File | Tests |
|----------|------|-------|
| **Run expert** | run.test.ts | Answer question, use tools, read PDF/image |
| **Interactive input** | interactive.test.ts | Stop at interactive tool |
| **Error handling** | error-handling.test.ts | Recover from tool error |
| **Storage behavior** | storage-behavior.test.ts | Verify no storage files created |
| **CLI validation** | validation.test.ts | Version, help, argument validation |

## Complete Test List

### perstack-cli/continue.test.ts (3 tests)

1. should continue job with --continue-job
2. should complete after continue
3. should continue after parallel delegation and complete

### perstack-cli/delegate.test.ts (6 tests)

1. should delegate to another expert
2. should chain through multiple experts
3. should return through chain and complete all runs
4. should delegate to multiple experts in parallel
5. should complete all parallel delegations
6. should resume coordinator after delegations complete

### perstack-cli/interactive.test.ts (4 tests)

1. should execute MCP tool before delegate
2. should collect partial results before stopping
3. should resume and stop at interactive tool
4. should have all partial results when stopped

### perstack-cli/runtime-selection.test.ts (5 tests)

1. should run with perstack runtime
2. should reject invalid runtime names
3. should show helpful error or succeed for cursor
4. should show helpful error for claude-code when unavailable
5. should show helpful error for gemini when unavailable
6. should use runtime from perstack.toml when --runtime not specified

### perstack-cli/publish.test.ts (9 tests)

1. should output JSON payload for valid expert with --dry-run
2. should fail for nonexistent expert
3. should fail with nonexistent config file
4. should fail when no config in directory
5. should fail without version (unpublish)
6. should fail without --force when version provided
7. should fail without version (tag)
8. should fail without tags
9. should fail without version (status)
10. should fail without status value
11. should fail with invalid status value

### perstack-cli/validation.test.ts (7 tests)

1. should fail without arguments
2. should fail with only expert key
3. should fail for nonexistent expert
4. should fail with nonexistent config file
5. should fail when --resume-from is used without --continue-job
6. should reject invalid runtime name
7. should fail with clear message for nonexistent delegate

### perstack-runtime/run.test.ts (9 tests)

1. should answer a simple question and complete
2. should execute multiple tools in parallel
3. should use think tool
4. should read PDF file
5. should read image file
6. should search the web
7. should complete run successfully
8. should read and summarize PDF content
9. should read and describe image content

### perstack-runtime/interactive.test.ts (1 test)

1. should stop at interactive tool and emit checkpoint

### perstack-runtime/error-handling.test.ts (1 test)

1. should recover from file not found error and complete successfully

### perstack-runtime/storage-behavior.test.ts (2 tests)

1. should create storage files when running expert
2. should NOT create new storage files when running expert

### perstack-runtime/validation.test.ts (7 tests)

1. should show version
2. should show help
3. should show run command help
4. should fail without arguments
5. should fail with only expert key
6. should fail for nonexistent expert
7. should fail with nonexistent config file

## Architecture Notes

### Two CLIs

| CLI                | Package             | Storage                           | Use Case                     |
| ------------------ | ------------------- | --------------------------------- | ---------------------------- |
| `perstack`         | `packages/perstack` | Creates files in `perstack/jobs/` | Primary user-facing CLI      |
| `perstack-runtime` | `packages/runtime`  | No storage (JSON events only)     | Standalone runtime execution |

### Key Differences

- **perstack CLI**: Uses `@perstack/runner` to dispatch to adapters. Manages storage, delegation resumption, and runtime selection.
- **perstack-runtime CLI**: Lightweight wrapper that executes experts and outputs JSON events. Does not handle delegation resumption or storage.

### Runtime Adapters

All runtimes (perstack, cursor, claude-code, gemini) are treated equally via the adapter pattern:

- Each adapter implements `RuntimeAdapter` interface
- `@perstack/runner` dispatches to adapters uniformly
- Storage is handled by runner, not by adapters

## Notes

- Tests run in parallel via vitest
- Runtime tests require API keys (set in `.env.local`)
- TUI-based commands (`start`) are excluded from E2E tests
- External runtime tests (cursor, claude-code, gemini) pass regardless of CLI availability
- `storage-behavior.test.ts` may fail in parallel execution due to race conditions (passes in isolation)
