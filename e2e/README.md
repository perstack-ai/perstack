# E2E Tests

End-to-end tests for Perstack CLI and runtime.

## Prerequisites

```bash
pnpm build
```

## Running Tests

```bash
# Run all E2E tests (sequential, fail-fast)
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
│   ├── continue.test.ts           # Continue job, resume from checkpoint
│   ├── delegate.test.ts           # Delegate to expert
│   ├── interactive.test.ts        # Interactive input (with delegation)
│   ├── runtime-selection.test.ts  # Select runtime
│   ├── publish.test.ts            # Publish expert
│   ├── registry.test.ts           # Remote expert resolution
│   └── validation.test.ts         # CLI validation
├── perstack-runtime/              # perstack-runtime CLI tests
│   ├── run.test.ts                # Run expert
│   ├── options.test.ts            # CLI options
│   ├── limits.test.ts             # Execution limits
│   ├── skills.test.ts             # Skill configuration
│   ├── interactive.test.ts        # Interactive input
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

| Use Case               | File                      | Tests                                                             |
| ---------------------- | ------------------------- | ----------------------------------------------------------------- |
| **Continue job**       | continue.test.ts          | Continue from interactive/delegation stop, resume from checkpoint |
| **Delegate to expert** | delegate.test.ts          | Chain delegation, parallel delegation                             |
| **Interactive input**  | interactive.test.ts       | Mixed tools with interactive (MCP + delegate + askUser)           |
| **Select runtime**     | runtime-selection.test.ts | CLI option, external runtimes, config file                        |
| **Publish expert**     | publish.test.ts           | Preview, unpublish, tag, status                                   |
| **Registry**           | registry.test.ts          | Remote expert resolution, remote delegation                       |
| **CLI validation**     | validation.test.ts        | Argument validation, config validation                            |

### perstack-runtime/

| Use Case              | File                     | Tests                                              |
| --------------------- | ------------------------ | -------------------------------------------------- |
| **Run expert**        | run.test.ts              | Answer question, use tools, read PDF/image         |
| **CLI options**       | options.test.ts          | Model, limits, job-id, env-path, verbose           |
| **Execution limits**  | limits.test.ts           | Max steps, max retries                             |
| **Skills**            | skills.test.ts           | Pick/omit tools, multiple skills                   |
| **Interactive input** | interactive.test.ts      | Stop at interactive tool                           |
| **Error handling**    | error-handling.test.ts   | Tool error, MCP error, invalid provider            |
| **Storage behavior**  | storage-behavior.test.ts | Verify storage is not created by runtime CLI       |
| **CLI validation**    | validation.test.ts       | Version, help, argument validation                 |

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

- Tests run sequentially with `fileParallelism: false` to reduce CPU load
- `--bail=1` stops on first failure for faster feedback
- Runtime tests require API keys (set in `.env.local`)
- TUI-based commands (`start`) are excluded from E2E tests
- External runtime tests (cursor, claude-code, gemini) pass regardless of CLI availability
