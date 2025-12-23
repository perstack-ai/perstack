---
title: "Error Handling"
---

# Error Handling

Perstack is designed to recover from errors automatically when possible. Most errors are fed back to the LLM for self-correction rather than crashing the run.

## How errors are handled

| Error type            | Behavior                                                   |
| --------------------- | ---------------------------------------------------------- |
| Tool/MCP errors       | Fed back to LLM — it can retry or try a different approach |
| LLM generation errors | Automatic retry with error context                         |
| Fatal errors          | Run stops with `stoppedByError`                            |

This design lets the LLM handle transient failures (network issues, rate limits, invalid tool arguments) without human intervention.

## Stop reasons

A Run ends with one of these checkpoint statuses:

| Status                      | Meaning                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `completed`                 | LLM called `attemptCompletion` with no remaining todos — task done |
| `stoppedByExceededMaxSteps` | Job's `maxSteps` limit reached                                     |
| `stoppedByInteractiveTool`  | Waiting for user input (Coordinator only)                          |
| `stoppedByDelegate`         | Waiting for delegate Expert                                        |
| `stoppedByError`            | Unrecoverable error                                                |

When a Run stops with `stoppedByExceededMaxSteps`, you can resume from the last checkpoint. See [State Management](./state-management.md).

## Delegation errors

When a Delegated Expert fails, the Job continues — the error is returned to the Coordinator, which decides how to handle it. See [Delegation failure handling](../understanding-perstack/experts.md#delegation-failure-handling) for details.

## Events for monitoring

Use `errorRun` events to monitor failures:

```bash
npx perstack run my-expert "query" | jq 'select(.type == "errorRun")'
```

For programmatic access:

```typescript
import { run } from "@perstack/runtime"

await run(params, {
  eventListener: (event) => {
    if (event.type === "errorRun") {
      // Log, alert, or handle the error
    }
  }
})
```

## Common issues

**MCP server not starting**: Check that `requiredEnv` variables are set and the command is correct.

**Tool call failures**: The LLM receives the error and usually retries. If failures persist, check the tool's input requirements.

**Rate limits**: The runtime retries automatically. For high-volume usage, configure provider rate limits or add delays.

## What's next

- [State Management](./state-management.md) — resuming after failures
- [Runtime](../understanding-perstack/runtime.md) — how the agent loop handles errors
