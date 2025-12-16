# QA Workflow

This document defines the quality assurance workflow for the Perstack project.

## Test Commands

| Command                | Purpose                   |
| ---------------------- | ------------------------- |
| `pnpm test`            | Run unit tests            |
| `pnpm test:e2e`        | Run E2E tests             |
| `pnpm typecheck`       | Type checking             |
| `pnpm format-and-lint` | Linting and formatting    |
| `pnpm check-deps`      | Unused dependencies check |

## Full QA Suite

Run all checks before creating a PR:

```bash
pnpm typecheck && pnpm format-and-lint && pnpm test && pnpm build && pnpm test:e2e
```

## Unit Tests

### Running Tests

```bash
pnpm test
pnpm --filter @perstack/runtime test
pnpm test -- --watch
pnpm test -- --coverage
```

### Test File Location

Tests are located next to the source files:

```
packages/runtime/src/
├── executor.ts
├── executor.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest"

describe("functionName", () => {
  it("should do something", () => {
    expect(result).toBe(expected)
  })
})
```

## E2E Tests

### Running E2E Tests

```bash
pnpm test:e2e
pnpm test:e2e -- --grep "test name"
```

### E2E Test Location

E2E tests are in the `e2e/` directory at the repository root.

## Coverage Requirements

Codecov enforces coverage requirements on PRs:

- **No coverage regression allowed**
- New code must have tests
- Coverage warnings must be fixed before merge

### Checking Coverage Locally

```bash
pnpm test -- --coverage
```

### Fixing Coverage Issues

1. Identify uncovered lines in the coverage report
2. Add tests for those lines
3. Run coverage again to verify

## Type Checking

```bash
pnpm typecheck
```

Type errors must be fixed before merge. Common issues:

| Error          | Solution                     |
| -------------- | ---------------------------- |
| Missing type   | Add explicit type annotation |
| Type mismatch  | Fix the type or the value    |
| Missing import | Import from `@perstack/core` |

## Linting and Formatting

```bash
pnpm format-and-lint
pnpm format-and-lint:fix
```

## Security Testing

For security-related changes, also verify:

1. **Environment variable handling**
   - Protected variables cannot be overridden
   - Case-insensitive matching works

2. **Path validation**
   - No path traversal possible
   - Symlinks rejected

3. **Docker runtime**
   - Proxy configuration correct
   - DNS rebinding protection works

See [audit.md](audit.md) for comprehensive security audit methodology.

## Pre-PR Checklist

Before creating a PR:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm format-and-lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test:e2e` passes
- [ ] No coverage regression
- [ ] Changeset created (if needed)

## CI Checks

PRs are validated by CI:

| Check                | Description       |
| -------------------- | ----------------- |
| Lint / Format / Knip | Code quality      |
| Build                | Compilation       |
| Test                 | Unit tests        |
| CI Success           | Final status gate |
| Codecov              | Coverage check    |
| Cursor Bugbot        | AI code review    |

All checks must pass before merge.

## Debugging Failing Tests

### Test Timeouts

If tests timeout:

```bash
pnpm test -- --timeout 30000
```

### Flaky Tests

If tests are flaky:

1. Check for race conditions
2. Check for shared state
3. Add proper async handling

### E2E Failures

If E2E tests fail:

1. Check console output for errors
2. Verify Docker is running (if using `--runtime docker`)
3. Check environment variables are set
