# E2E Testing Rules

This document defines the rules for writing and running E2E tests.

## Running E2E Tests

### Full E2E Suite

```bash
pnpm run test:e2e
```

### Running Specific Test Files

**IMPORTANT**: Always use the `test:e2e` script with file path to preserve `vitest.config.ts` settings:

```bash
# ✅ Correct - preserves vitest.config.ts settings
pnpm run test:e2e e2e/perstack-runtime/reasoning-budget.test.ts
pnpm run test:e2e e2e/perstack-runtime/skills.test.ts

# ❌ Wrong - ignores vitest.config.ts, runs all tests
vitest run e2e/perstack-runtime/reasoning-budget.test.ts
npx vitest e2e/perstack-runtime/reasoning-budget.test.ts
```

### Running Tests by Name Pattern

```bash
pnpm run test:e2e -- --grep "Reasoning Budget"
pnpm run test:e2e -- --grep "should produce reasoning tokens"
```

### Combining File and Name Filters

```bash
pnpm run test:e2e e2e/perstack-runtime/reasoning-budget.test.ts -- --grep "Anthropic"
```

## E2E Test Structure

### File Organization

```
e2e/
├── experts/                          # Expert TOML configurations
│   ├── reasoning-budget.toml
│   ├── skills.toml
│   └── ...
├── perstack-runtime/                 # Runtime tests
│   ├── reasoning-budget.test.ts
│   ├── skills.test.ts
│   └── ...
├── lib/                              # Test utilities
│   ├── assertions.ts
│   ├── event-parser.ts
│   └── runner.ts
└── vitest.config.ts                  # E2E-specific vitest config
```

### Test File Naming

- Test files: `*.test.ts`
- TOML configs: named after the test purpose (e.g., `reasoning-budget.toml`)

## Writing E2E Tests

### Basic Test Structure

```typescript
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const CONFIG_PATH = "./e2e/experts/your-config.toml"
const LLM_TIMEOUT = 180000 // 3 minutes for LLM API calls

describe("Feature Name", () => {
  it(
    "should do something",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", CONFIG_PATH, "expert-key", "query"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)

      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(true)
    },
    LLM_TIMEOUT,
  )
})
```

### Timeout Guidelines

| Test Type             | Timeout     |
| --------------------- | ----------- |
| Simple LLM call       | 60000 (1m)  |
| Extended thinking     | 180000 (3m) |
| Multiple LLM calls    | Per call    |
| Docker initialization | 300000 (5m) |

### Event Assertions

```typescript
// Check event sequence
expect(assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed).toBe(true)

// Filter events by type
const callToolsEvents = filterEventsByType(result.events, "callTools")

// Check tool usage
const hasToolCall = callToolsEvents.some((e) => {
  const event = e as { toolCalls?: Array<{ toolName: string }> }
  return event.toolCalls?.some((tc) => tc.toolName === "targetTool")
})
expect(hasToolCall).toBe(true)

// Check usage/tokens
const completeEvents = filterEventsByType(result.events, "completeRun")
const usage = (completeEvents[0] as { usage?: { reasoningTokens?: number } })?.usage
expect(usage?.reasoningTokens).toBeGreaterThan(0)
```

## Expert TOML Configuration

### Basic Expert Definition

```toml
runtime = "local"  # Use "local" for E2E tests unless testing Docker specifically

[experts."e2e-test-expert"]
version = "1.0.0"
description = "E2E test expert for feature X"
instruction = """
Your instruction here.
"""

[experts."e2e-test-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["attemptCompletion", "todo"]  # Only include needed tools
```

### Provider-Specific Tests

When testing provider-specific features, use CLI options:

```typescript
await runRuntimeCli([
  "run",
  "--config", CONFIG_PATH,
  expertKey,
  "query",
  "--provider", "anthropic",
  "--model", "claude-sonnet-4-5",
  "--reasoning-budget", "medium",
])
```

## Common Patterns

### Testing Multiple Configurations

```typescript
const budgets = ["minimal", "low", "medium", "high"] as const

for (const budget of budgets) {
  const result = await runTest(budget)
  expect(result.success).toBe(true)
}
```

### Comparing Results

```typescript
const minimalResult = await runTest("minimal")
const highResult = await runTest("high")

// Log for analysis (statistical tendencies, not strict assertions)
console.log(`minimal: ${minimalResult.tokens}, high: ${highResult.tokens}`)
```

## Debugging E2E Tests

### Verbose Output

```bash
pnpm run test:e2e e2e/perstack-runtime/reasoning-budget.test.ts -- --reporter=verbose
```

### Check Console Output

```typescript
const result = withEventParsing(cmdResult)
console.log("stdout:", result.stdout)
console.log("stderr:", result.stderr)
console.log("events:", JSON.stringify(result.events, null, 2))
```

### Common Failures

| Issue              | Solution                                    |
| ------------------ | ------------------------------------------- |
| Timeout            | Increase timeout, check API availability    |
| Docker not running | Start Docker, or use `runtime = "local"`    |
| API key missing    | Check `.env` file, `envPath` in TOML        |
| Event not found    | Check event type spelling, use debug output |
| Tool not available | Check `pick`/`omit` in skill config         |

