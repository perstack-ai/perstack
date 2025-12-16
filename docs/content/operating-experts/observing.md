# Observing

Every Perstack execution produces a complete audit trail. Use events and checkpoints to monitor, debug, and verify Expert behavior.

## Event stream

`perstack run` outputs JSON events to stdout:

```bash
npx perstack run my-expert "query" | tee execution.jsonl
```

Each line is a JSON object:

```json
{"type":"startRun","timestamp":1234567890,"runId":"abc123",...}
{"type":"startGeneration","timestamp":1234567891,...}
{"type":"finishGeneration","timestamp":1234567892,...}
{"type":"finishStep","timestamp":1234567893,...}
{"type":"finishRun","timestamp":1234567894,...}
```

## Event types

| Event                                  | When               |
| -------------------------------------- | ------------------ |
| `startRun`                             | Run begins         |
| `startGeneration` / `finishGeneration` | LLM call lifecycle |
| `finishStep`                           | Step completes     |
| `finishRun`                            | Run ends           |
| `errorRun`                             | Error occurs       |

For the full event schema and state machine, see [Runtime](../understanding-perstack/runtime.md#internal-state-machine).

## Filtering events

Use `jq` to extract specific information:

```bash
# Errors only
npx perstack run my-expert "query" | jq 'select(.type == "errorRun")'

# Token usage per step
npx perstack run my-expert "query" | jq 'select(.type == "finishGeneration") | {step, usage}'

# Final result
npx perstack run my-expert "query" | jq 'select(.type == "finishRun")'
```

## Checkpoints

Checkpoints are saved to `perstack/jobs/{jobId}/runs/{runId}/` in the workspace. Each checkpoint contains complete state — message history, usage, Expert info — enabling replay and forensic analysis.

See [Runtime](../understanding-perstack/runtime.md#the-perstack-directory) for the full directory structure.

## Integrating with monitoring

### CloudWatch (AWS)

```bash
npx perstack run my-expert "query" 2>&1 | \
  while read line; do
    echo "$line" | aws logs put-log-events ...
  done
```

Or use ECS/Fargate log drivers to capture stdout automatically.

### Custom integration

```typescript
import { run } from "@perstack/runtime"

await run(params, {
  eventListener: (event) => {
    // Send to your monitoring system
    metrics.increment(`perstack.${event.type}`)
    if (event.type === "errorRun") {
      alerting.notify(event)
    }
    if (event.type === "finishRun") {
      metrics.gauge("perstack.tokens", event.totalUsage.totalTokens)
    }
  }
})
```

## Auditing checklist

For compliance and security audits:

- [ ] All runs produce event logs
- [ ] Checkpoints retained for required period
- [ ] Token usage tracked per Expert/run
- [ ] Errors monitored and alerted
- [ ] Event logs correlated with platform audit logs

## What's next

- [Runtime](../understanding-perstack/runtime.md) — how events and checkpoints work
- [Error Handling](../using-experts/error-handling.md) — handling failures
- [Isolation by Design](./isolation-by-design.md) — security configuration

