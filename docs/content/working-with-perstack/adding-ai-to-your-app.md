# Adding AI to Your App

You have an existing application — maybe a web app, a CLI tool, or a backend service. You want to add AI capabilities, but you're not sure where to start.

**The challenge**: Agent frameworks often want to own the entire application. They're designed for building agent-first apps, not for embedding AI into existing systems.

**With Perstack**: Your app stays in control. The runtime executes Experts and emits events. You decide what to do with them.

## The framework trap

Agent frameworks promise to handle complexity, but often become the complexity. Teams find themselves spending as much time debugging the framework as building features. Even LangChain's team acknowledged that "the biggest competitor to any code framework is always no framework."

Perstack takes a different approach: it's a runtime, not a framework. Your code doesn't live inside Perstack — Perstack lives inside your code. You stay in control.

## Recommended pattern: Docker isolation

Run Experts in isolated Docker containers. Your app orchestrates containers and processes their output.

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  perstack-expert my-expert "user query"
```

Each execution:
- Runs in a fresh container (isolated)
- Outputs JSON events to stdout (observable)
- Writes checkpoints to the mounted workspace (resumable)

This is the recommended pattern because:
- **Isolation**: Agent execution is sandboxed from your application
- **Observability**: Every event is captured as structured JSON
- **Reliability**: Containers can be restarted, scaled, and monitored independently

See [Going to Production](./going-to-production.md) for the full Docker setup.

## Handling runtime events

`perstack run` outputs one JSON event per line to stdout. Your app reads these events and reacts as needed.

### Event types

Common events you'll handle:

| Event                                  | Meaning              |
| -------------------------------------- | -------------------- |
| `startRun` / `finishRun`               | Run lifecycle        |
| `startGeneration` / `finishGeneration` | LLM call lifecycle   |
| `callTools`                            | Expert calling tools |
| `completeRun`                          | Execution finished   |

For the full event schema, see [Runtime](../understanding-perstack/runtime.md#event-notification).

### Run status

When execution ends, the final checkpoint indicates why:

| Status                      | Meaning                           | Next action                             |
| --------------------------- | --------------------------------- | --------------------------------------- |
| `completed`                 | Expert finished successfully      | Done, or continue with new query        |
| `stoppedByInteractiveTool`  | Expert called an interactive tool | Your app handles the tool, then resumes |
| `stoppedByExceededMaxSteps` | Hit max steps limit               | Continue or abort                       |
| `stoppedByError`            | Error occurred                    | Check logs, retry or abort              |

### Continuing a run

To continue a completed run with a new query:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  perstack-expert my-expert "follow-up query" --continue
```

The `--continue` flag resumes from the most recent checkpoint in the workspace.

### Handling checkpoints

Checkpoints are saved to the workspace (see [Runtime](../understanding-perstack/runtime.md#the-perstack-directory)). Each checkpoint contains the full execution state — you can resume from any checkpoint.

```bash
# Resume from a specific checkpoint
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  perstack-expert my-expert --resume-from <checkpoint-id>
```

> [!NOTE]
> Checkpoints enable time-travel debugging. If something went wrong, you can resume from an earlier checkpoint and try a different approach.

## Runtime embedding (optional)

For tighter integration, you can embed the runtime directly in your TypeScript/JavaScript application using `@perstack/runtime`. This gives you programmatic control over execution and real-time event handling.

See [Running Experts](../using-experts/running-experts.md) for the embedding API.

## What's next

- [Going to Production](./going-to-production.md) — Docker setup and production deployment
- [Running Experts](../using-experts/running-experts.md) — CLI commands and runtime API
- [State Management](../using-experts/state-management.md) — Checkpoints, pausing, resuming

