# Runtime

The Perstack runtime combines probabilistic LLM reasoning with deterministic state management — making agent execution predictable, reproducible, and auditable.

## Execution model

The runtime organizes execution into a three-level hierarchy:

```
Job (jobId)
 ├── Run 1 (runId, Coordinator Expert)
 │    └── Checkpoints...
 ├── Run 2 (runId, Delegated Expert A)
 │    └── Checkpoints...
 └── Run 3 (runId, Delegated Expert B)
      └── Checkpoints...
```

| Concept        | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| **Job**        | Top-level execution unit. Created per `perstack run` invocation. Contains all Runs. |
| **Run**        | Single Expert execution. Each delegation creates a new Run within the same Job.     |
| **Checkpoint** | Snapshot at the end of each step within a Run.                                      |

### Coordinator vs. Delegated Expert

| Role                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| **Coordinator Expert** | The initial Expert that starts a Job. Has full capabilities. |
| **Delegated Expert**   | Expert started via delegation. Restricted capabilities.      |

Key differences:

| Capability                     | Coordinator | Delegated                          |
| ------------------------------ | ----------- | ---------------------------------- |
| Interactive tool calls         | ✅ Available | ❌ Not available                    |
| `--continue` / `--resume-from` | ✅ Supported | ❌ Not supported                    |
| Context from parent            | N/A         | Only the query (no shared history) |

> [!TIP]
> Delegated Experts cannot use interactive tools. See [Why no interactive tools for delegates?](./experts.md#why-no-interactive-tools-for-delegates)

## Agent loop

Each Run executes through an agent loop:

```
┌─────────────────────────────────────────────────────┐
│  1. Reason    →  LLM decides next action            │
│  2. Act       →  Runtime executes tool              │
│  3. Record    →  Checkpoint saved                   │
│  4. Repeat    →  Until completion or limit          │
└─────────────────────────────────────────────────────┘
```

The loop ends when:
- LLM calls `attemptCompletion` with all todos complete (or no todos)
- Job reaches `maxSteps` limit
- External signal (SIGTERM/SIGINT)

When `attemptCompletion` is called, the runtime checks the todo list. If incomplete todos remain, they are returned to the LLM to continue work. This prevents premature completion and ensures all planned tasks are addressed.

### Step counting

Step numbers are continuous across all Runs within a Job. When delegation occurs, the delegated Run continues from the parent's step number:

```
Job (totalSteps = 8)
 ├── Run 1 (Coordinator): step 1 → 2 → delegates at step 3
 │                              ↓
 ├── Run 2 (Delegate A): step 3 → 4 → completes
 │                              ↓
 └── Run 1 continues: step 5 → 6 → 7 → 8
```

The `maxSteps` limit applies to the Job's total steps across all Runs.

### Stopping and resuming

```bash
npx perstack run my-expert "query" --max-steps 50
```

| Stop condition                           | Behavior       | Resume from                       |
| ---------------------------------------- | -------------- | --------------------------------- |
| `attemptCompletion` (no remaining todos) | Task complete  | N/A                               |
| `attemptCompletion` (remaining todos)    | Continue loop  | N/A (loop continues)              |
| `maxSteps` reached                       | Graceful stop  | Coordinator's last checkpoint     |
| SIGTERM/SIGINT                           | Immediate stop | Coordinator's previous checkpoint |

> [!WARNING]
> `--continue` and `--resume-from` only work with the Coordinator Expert's checkpoints. You cannot resume from a Delegated Expert's checkpoint.

## Deterministic state

LLMs are probabilistic — same input can produce different outputs. Perstack draws a clear boundary:

| Probabilistic (LLM)       | Deterministic (Runtime) |
| ------------------------- | ----------------------- |
| Which tool to call        | Tool execution          |
| Todo management decisions | State recording         |
| Reasoning                 | Checkpoint creation     |

The "thinking" is probabilistic; the "doing" and "recording" are deterministic. This boundary enables:
- **Reproducibility**: Replay from any checkpoint with identical state
- **Testability**: Mock the LLM, test the runtime deterministically

### Event, Step, Checkpoint

Runtime state is built on three concepts:

| Concept        | What it represents                                          |
| -------------- | ----------------------------------------------------------- |
| **Event**      | A single state transition (tool call, result, etc.)         |
| **Step**       | One cycle of the agent loop                                 |
| **Checkpoint** | Complete snapshot at step end — everything needed to resume |

This combines **Event Sourcing** (complete history) with **Checkpoint/Restore** (efficient resume).

### The `perstack/` directory

The runtime stores execution history in `perstack/jobs/` within the workspace:

```
/workspace
└── perstack/
    └── jobs/
        └── {jobId}/
            ├── job.json                                   # Job metadata
            └── runs/
                └── {runId}/
                    ├── run-setting.json                   # Run configuration
                    ├── checkpoint-{timestamp}-{step}-{id}.json
                    └── event-{timestamp}-{step}-{type}.json
```

This directory is managed automatically — don't modify it manually.

## Event notification

The runtime emits events for every state change. Two options:

### stdout (default)

Events are written to stdout as JSON. This is the safest option for sandboxed environments — no network access required.

```bash
npx perstack run my-expert "query"
```

Your infrastructure reads stdout and decides what to do with events. See [Sandbox Integration](./sandbox-integration.md) for the rationale.

### Custom event listener

When embedding the runtime programmatically, use a callback:

```typescript
import { run } from "@perstack/runtime"

await run(params, {
  eventListener: (event) => {
    // Send to your monitoring system, database, etc.
  }
})
```

## Skills (MCP)

Experts use tools through MCP (Model Context Protocol). The runtime handles:

- **Lifecycle**: Start MCP servers with Expert, clean up on exit
- **Environment isolation**: Only `requiredEnv` variables are passed
- **Error recovery**: MCP failures are fed back to LLM, not thrown as runtime errors

For skill configuration, see [Skills](../making-experts/skills.md).

### Base skill optimization

The `@perstack/base` skill provides essential tools (file operations, exec, etc.) required by every Expert. To minimize startup latency, the runtime bundles this skill and uses in-process communication:

| Configuration                               | Transport              | Latency |
| ------------------------------------------- | ---------------------- | ------- |
| Default (no version specified)              | InMemoryTransport      | <50ms   |
| Explicit version (`@perstack/base@1.0.0`)   | StdioTransport via npx | ~500ms  |
| Custom command (`perstackBaseSkillCommand`) | StdioTransport         | Varies  |

**How it works:**

- **InMemoryTransport**: The bundled base skill runs in the same process as the runtime, using MCP SDK's `InMemoryTransport` for zero-IPC communication
- **Version pinning fallback**: When you specify an explicit version (e.g., `@perstack/base@0.0.34`), the runtime falls back to spawning via `npx` to ensure reproducibility

**When to pin versions:**

Pin a specific base skill version when:
- You need reproducible builds across environments
- You're debugging version-specific behavior
- Your deployment requires exact version control

```toml
# Default: uses bundled base (fastest)
[experts.my-expert.skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"

# Pinned version: uses npx (slower but reproducible)
[experts.my-expert.skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base@0.0.34"
```

## Native reasoning

Perstack supports native LLM reasoning (extended thinking / test-time scaling) for providers that support it. Configure via `reasoningBudget`:

```toml
reasoningBudget = "medium"  # minimal, low, medium, high, or token count
```

Native reasoning is applied during the final result generation (after tool execution), not during tool selection. This ensures reasoning depth is used where it matters most — synthesizing results.

| Provider  | Support | Implementation                       |
| --------- | ------- | ------------------------------------ |
| Anthropic | Yes     | Extended thinking (`budgetTokens`)   |
| OpenAI    | Yes     | Reasoning effort (`reasoningEffort`) |
| Google    | Planned | Flash Thinking mode                  |
| DeepSeek  | Partial | Use `deepseek-reasoner` model        |

## Providers and models

Perstack uses standard LLM features available from most providers:
- Chat completion (including PDF/image in messages)
- Tool calling
- Native reasoning (where supported)

For supported providers and models, see [Providers and Models](../references/providers-and-models.md).
