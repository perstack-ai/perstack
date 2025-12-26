---
title: "Events Reference"
---

# Events Reference

Perstack emits events during Expert execution for observability and state management. This document explains the event system architecture and how to consume events.

## Event Types Overview

```
PerstackEvent = RunEvent | RuntimeEvent
```

| Event Type     | Purpose                             | Accumulation      |
| -------------- | ----------------------------------- | ----------------- |
| `RunEvent`     | Primary effects of Expert execution | Accumulated log   |
| `RuntimeEvent` | Side effects of Expert execution    | Latest state only |

## RunEvent

RunEvent represents events related to a **Run** — the execution unit of an Expert.

### Hierarchy

```
Job
 └── Run (has many)
      └── Events → Steps → Checkpoints
```

| Concept        | Description                                        |
| -------------- | -------------------------------------------------- |
| **Job**        | Top-level execution unit (one per `perstack run`)  |
| **Run**        | Single Expert execution within a Job               |
| **Step**       | One cycle of the agent loop                        |
| **Checkpoint** | Snapshot at step end — everything needed to resume |

Steps and Checkpoints are designed to be **deterministic and observable** through the agent loop state machine. RunEvents represent transitions in this state machine.

### Base Properties

All RunEvents share these properties:

```typescript
interface BaseEvent {
  id: string          // Unique event ID
  expertKey: string   // Expert that emitted this event
  timestamp: number   // Unix timestamp
  jobId: string       // Job ID
  runId: string       // Run ID
  stepNumber: number  // Step number when emitted
}
```

### Event Types

#### Lifecycle Events

| Event Type    | Description                | Key Payload                           |
| ------------- | -------------------------- | ------------------------------------- |
| `startRun`    | Run started                | `initialCheckpoint`, `inputMessages`  |
| `completeRun` | Run completed successfully | `checkpoint`, `step`, `text`, `usage` |

#### Generation Events

| Event Type        | Description                 | Key Payload                      |
| ----------------- | --------------------------- | -------------------------------- |
| `startGeneration` | LLM generation started      | `messages`                       |
| `retry`           | Generation failed, retrying | `reason`, `newMessages`, `usage` |

#### Tool Call Events

| Event Type            | Description                              | Key Payload                              |
| --------------------- | ---------------------------------------- | ---------------------------------------- |
| `callTools`           | Regular tool calls                       | `newMessage`, `toolCalls`, `usage`       |
| `callInteractiveTool` | Interactive tool call (needs user input) | `newMessage`, `toolCall`, `usage`        |
| `callDelegate`        | Delegation to another Expert             | `newMessage`, `toolCalls`, `usage`       |
| `resolveToolResults`  | Tool results received                    | `toolResults`                            |
| `attemptCompletion`   | Completion tool called                   | `toolResult`                             |
| `finishToolCall`      | Single tool call finished                | `newMessages`                            |
| `resumeToolCalls`     | Resume pending tool calls                | `pendingToolCalls`, `partialToolResults` |
| `finishAllToolCalls`  | All tool calls finished                  | `newMessages`                            |

#### Step Transition Events

| Event Type           | Description             | Key Payload                            |
| -------------------- | ----------------------- | -------------------------------------- |
| `continueToNextStep` | Proceeding to next step | `checkpoint`, `step`, `nextCheckpoint` |

#### Stop Events

| Event Type                  | Description                    | Key Payload                   |
| --------------------------- | ------------------------------ | ----------------------------- |
| `stopRunByInteractiveTool`  | Stopped for user input         | `checkpoint`, `step`          |
| `stopRunByDelegate`         | Stopped for delegation         | `checkpoint`, `step`          |
| `stopRunByExceededMaxSteps` | Stopped due to max steps limit | `checkpoint`, `step`          |
| `stopRunByError`            | Stopped due to error           | `checkpoint`, `step`, `error` |

### Processing RunEvents

RunEvents should be **accumulated** as execution history. Each event represents a state transition that contributes to the complete execution log.

```typescript
// Example: Accumulating RunEvents as log entries
const logs: LogEntry[] = []

function processEvent(event: PerstackEvent) {
  if (!isRunEvent(event)) return
  
  switch (event.type) {
    case "startRun":
      logs.push({ type: "query", text: extractQuery(event) })
      break
    case "callTools":
      logs.push({ type: "toolCall", tools: event.toolCalls })
      break
    case "completeRun":
      logs.push({ type: "completion", text: event.text })
      break
    // ... handle other events
  }
}
```

## RuntimeEvent

RuntimeEvent represents **side effects** of Expert execution — the runtime environment state rather than the state machine itself.

### Characteristics

- Only the **latest state matters** — past RuntimeEvents are not meaningful
- Includes infrastructure-level information (skills, Docker, proxy, streaming)
- Not tied to the agent loop state machine

### Base Properties

All RuntimeEvents share these properties:

```typescript
interface BaseRuntimeEvent {
  id: string        // Unique event ID
  timestamp: number // Unix timestamp
  jobId: string     // Job ID
  runId: string     // Run ID
}
```

### Event Types

#### Initialization Events

| Event Type          | Description         | Key Payload                                   |
| ------------------- | ------------------- | --------------------------------------------- |
| `initializeRuntime` | Runtime initialized | `runtimeVersion`, `expertName`, `model`, etc. |

#### Skill Lifecycle Events

| Event Type          | Description            | Key Payload                               |
| ------------------- | ---------------------- | ----------------------------------------- |
| `skillStarting`     | MCP skill starting     | `skillName`, `command`, `args`            |
| `skillConnected`    | MCP skill connected    | `skillName`, `serverInfo`, timing metrics |
| `skillStderr`       | Skill stderr output    | `skillName`, `message`                    |
| `skillDisconnected` | MCP skill disconnected | `skillName`                               |

#### Docker Events

| Event Type              | Description             | Key Payload                               |
| ----------------------- | ----------------------- | ----------------------------------------- |
| `dockerBuildProgress`   | Docker build progress   | `stage`, `service`, `message`, `progress` |
| `dockerContainerStatus` | Container status change | `status`, `service`, `message`            |

#### Network Events

| Event Type    | Description                | Key Payload                          |
| ------------- | -------------------------- | ------------------------------------ |
| `proxyAccess` | Network access allow/block | `action`, `domain`, `port`, `reason` |

#### Streaming Events

| Event Type          | Description               | Key Payload |
| ------------------- | ------------------------- | ----------- |
| `startReasoning`    | Start of reasoning stream | (empty)     |
| `streamReasoning`   | Reasoning delta           | `delta`     |
| `completeReasoning` | Reasoning complete        | `text`      |
| `startRunResult`    | Start of result stream    | (empty)     |
| `streamRunResult`   | Result delta              | `delta`     |
| `streamingText`     | Text streaming (legacy)   | `text`      |

### Processing RuntimeEvents

RuntimeEvents should be processed as **current state** — only the latest value matters.

```typescript
// Example: Managing RuntimeEvent as current state
type RuntimeState = {
  skills: Map<string, SkillStatus>
  streaming: { reasoning?: string; result?: string }
  // ...
}

function handleRuntimeEvent(state: RuntimeState, event: PerstackEvent): RuntimeState {
  if (!isRuntimeEvent(event)) return state
  
  switch (event.type) {
    case "skillConnected":
      return {
        ...state,
        skills: new Map(state.skills).set(event.skillName, { status: "connected" })
      }
    case "streamReasoning":
      return {
        ...state,
        streaming: { 
          ...state.streaming, 
          reasoning: (state.streaming.reasoning ?? "") + event.delta 
        }
      }
    // ... handle other events
  }
  return state
}
```

## CheckpointAction

While RunEvents represent raw state machine transitions, **CheckpointAction** provides a human-friendly abstraction for understanding Expert behavior.

### Why CheckpointAction?

A single Step may contain multiple actions:
- Parallel tool calls (e.g., reading multiple files simultaneously)
- Multiple delegations
- Tool calls followed by result processing

RunEvents capture every state transition, but for human users who want to understand "what did the Expert do?", this level of detail can be overwhelming. CheckpointAction extracts the meaningful actions from a Step.

```
Step (agent loop cycle)
 └── May contain multiple actions
      ├── readTextFile (file1.ts)
      ├── readTextFile (file2.ts)  ← parallel execution
      └── readTextFile (file3.ts)
```

### Extracting Actions

Use `getCheckpointActions` to extract actions from a Checkpoint and Step:

```typescript
import { getCheckpointActions } from "@perstack/core"

const actions = getCheckpointActions({ checkpoint, step })
// Returns: CheckpointAction[]
```

Each action includes:
- `type` — Action type (e.g., `readTextFile`, `exec`, `delegate`)
- `reasoning` — LLM's thinking process before this action (if available)
- Action-specific fields (e.g., `path`, `content`, `error`)

### Action Types

#### Lifecycle Actions

| Type       | Description                     |
| ---------- | ------------------------------- |
| `query`    | User input that started the run |
| `complete` | Run completed with final result |
| `error`    | Run stopped due to error        |
| `retry`    | Generation failed, will retry   |

#### File Operations

| Type             | Description                |
| ---------------- | -------------------------- |
| `readTextFile`   | Read a text file           |
| `readImageFile`  | Read an image file         |
| `readPdfFile`    | Read a PDF file            |
| `writeTextFile`  | Write/create a text file   |
| `editTextFile`   | Edit existing file content |
| `appendTextFile` | Append to a file           |
| `deleteFile`     | Delete a file              |
| `moveFile`       | Move/rename a file         |
| `getFileInfo`    | Get file metadata          |

#### Directory Operations

| Type              | Description             |
| ----------------- | ----------------------- |
| `listDirectory`   | List directory contents |
| `createDirectory` | Create a directory      |
| `deleteDirectory` | Delete a directory      |

#### Execution

| Type   | Description             |
| ------ | ----------------------- |
| `exec` | Shell command execution |

#### Task Management

| Type                | Description            |
| ------------------- | ---------------------- |
| `todo`              | Update todo list       |
| `clearTodo`         | Clear all todos        |
| `attemptCompletion` | Signal task completion |

#### Collaboration

| Type              | Description                |
| ----------------- | -------------------------- |
| `delegate`        | Delegate to another Expert |
| `interactiveTool` | Tool requiring user input  |
| `generalTool`     | Any other MCP tool call    |

### Use Cases

CheckpointAction is designed for:

1. **UI Display** — Show users what the Expert is doing in a clear, actionable format
2. **Interactive Sessions** — Help users understand Expert behavior for effective collaboration
3. **Logging** — Create human-readable execution logs
4. **Debugging** — Trace specific actions without parsing raw events

```typescript
// Example: Displaying actions in a UI
function ActionLog({ actions }: { actions: CheckpointAction[] }) {
  return (
    <ul>
      {actions.map((action, i) => (
        <li key={i}>
          {action.type === "readTextFile" && `📄 Read ${action.path}`}
          {action.type === "writeTextFile" && `✏️ Write ${action.path}`}
          {action.type === "exec" && `⚡ Run ${action.command}`}
          {action.type === "delegate" && `🤝 Delegate to ${action.expertKey}`}
          {action.type === "complete" && `✅ Complete: ${action.text}`}
        </li>
      ))}
    </ul>
  )
}
```

## LogEntry

**LogEntry** wraps a CheckpointAction with metadata for tracking execution across multiple Runs, including parallel delegations.

### Structure

```typescript
type LogEntry = {
  /** Unique identifier for this entry */
  id: string
  /** The checkpoint action */
  action: CheckpointAction
  /** Expert that executed this action */
  expertKey: string
  /** Run ID this entry belongs to */
  runId: string
  /** Previous entry ID within the same Run (daisy chain) */
  previousEntryId?: string
  /** Parent Run information (for delegated Runs) */
  delegatedBy?: {
    expertKey: string
    runId: string
  }
}
```

### Daisy Chain Architecture

LogEntry uses a **two-level daisy chain** to maintain ordering:

1. **Within-Run ordering**: `previousEntryId` links entries in the same Run
2. **Cross-Run ordering**: `delegatedBy` links child Runs to their parent Run

This architecture supports:
- **Flat storage**: All entries in a single append-only array
- **Run isolation**: Each Run forms an independent chain via `previousEntryId`
- **Parallel delegation**: Multiple child Runs can share the same `delegatedBy.runId`
- **Flexible rendering**: Group by `runId`, or flatten with `expertKey` labels

### Example: Parallel Delegation

```
Run: parent-run (delegatedBy: undefined)
  entry-1 (prev: null)     → query: "Process data"
  entry-2 (prev: entry-1)  → readFile: config.json
  entry-3 (prev: entry-2)  → delegate: [child-math, child-text]

Run: child-math-run (delegatedBy: { expertKey: "parent", runId: "parent-run" })
  entry-4 (prev: null)     → query: "Calculate sum"
  entry-5 (prev: entry-4)  → complete: "Math result: 42"

Run: child-text-run (delegatedBy: { expertKey: "parent", runId: "parent-run" })
  entry-6 (prev: null)     → query: "Format text"
  entry-7 (prev: entry-6)  → complete: "Text result: hello"

Run: parent-run (resumed)
  entry-8 (prev: entry-3)  → complete: "All done"
```

Key observations:
- `entry-4` and `entry-6` both have `delegatedBy.runId: "parent-run"` (parallel)
- `entry-8.previousEntryId` is `entry-3`, resuming the parent chain
- Each Run's entries form a linked list via `previousEntryId`

### Rendering Strategies

**Group by Run** (recommended for TUI):
```typescript
const logsByRun = logs.reduce((acc, entry) => {
  const list = acc.get(entry.runId) ?? []
  list.push(entry)
  acc.set(entry.runId, list)
  return acc
}, new Map<string, LogEntry[]>())

// Render each Run as a separate <Static> component
for (const [runId, entries] of logsByRun) {
  render(<RunLog runId={runId} entries={entries} />)
}
```

**Flatten with labels** (for simple logging):
```typescript
for (const entry of logs) {
  console.log(`[${entry.expertKey}] ${formatAction(entry.action)}`)
}
```

**Build tree structure** (for hierarchical display):
```typescript
function buildTree(logs: LogEntry[]): RunNode[] {
  const rootRuns = logs.filter(e => !e.delegatedBy && !e.previousEntryId)
  // ... recursively build tree using delegatedBy relationships
}
```

## Architectural Distinction

### Primary vs Side Effects

| Aspect             | RunEvent (Primary)            | RuntimeEvent (Side Effect) |
| ------------------ | ----------------------------- | -------------------------- |
| **What it tracks** | State machine transitions     | Runtime environment state  |
| **Accumulation**   | Accumulated as history        | Only latest state matters  |
| **Determinism**    | Deterministic, reproducible   | Environment-dependent      |
| **Persistence**    | Stored with checkpoints       | Typically not persisted    |
| **Consumer use**   | Execution logs, replay, audit | UI updates, monitoring     |

### Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Runtime                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Agent Loop State Machine                │    │
│  │                                                      │    │
│  │   Init → Generate → CallTools → Resolve → Finish    │    │
│  │     │         │          │          │         │      │    │
│  │     └─────────┴──────────┴──────────┴─────────┘      │    │
│  │                      │                                │    │
│  │                  RunEvents                            │    │
│  │            (state transitions)                        │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│  ┌──────────────────────┼───────────────────────────────┐    │
│  │   Skills, Docker, Proxy, Streaming                    │    │
│  │                      │                                │    │
│  │              RuntimeEvents                            │    │
│  │           (environment state)                         │    │
│  └──────────────────────┴───────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Consumer Examples

### CLI Filter Script

When using `perstack run`, output contains JSON events. Filter them for readability:

```typescript
import * as readline from "node:readline"

function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string
  const expertKey = event.expertKey as string
  
  // RunEvents have expertKey
  if (expertKey) {
    switch (type) {
      case "startRun": return `[${expertKey}] Starting...`
      case "callTools": {
        const toolCalls = event.toolCalls as Array<{ toolName: string }>
        return `[${expertKey}] Tools: ${toolCalls.map(t => t.toolName).join(", ")}`
      }
      case "completeRun": return `[${expertKey}] Done: ${event.text}`
      case "stopRunByError": return `[${expertKey}] Error: ${(event.error as { message: string }).message}`
    }
  }
  
  // RuntimeEvents
  switch (type) {
    case "skillConnected": return `Skill connected: ${event.skillName}`
    case "dockerBuildProgress": return `Docker: ${event.message}`
    case "proxyAccess": {
      const action = event.action === "allowed" ? "✓" : "✗"
      return `Proxy ${action} ${event.domain}:${event.port}`
    }
  }
  
  return null
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })
rl.on("line", (line) => {
  try {
    const event = JSON.parse(line)
    const formatted = formatEvent(event)
    if (formatted) console.log(formatted)
  } catch {}
})
```

### React Integration

Use the provided hooks from `@perstack/react`:

```typescript
import { useLogStore, useRuntimeState } from "@perstack/react"

function ExpertRunner() {
  // RunEvents → accumulated log entries
  const { logs, addEvent: addLogEvent } = useLogStore()
  
  // RuntimeEvents → current state
  const { runtimeState, handleRuntimeEvent } = useRuntimeState()

  const handleEvent = (event: PerstackEvent) => {
    // Try RuntimeEvent first (returns false if not handled)
    if (!handleRuntimeEvent(event)) {
      // Must be RunEvent, add to log
      addLogEvent(event)
    }
  }

  return (
    <div>
      {/* Show current runtime state */}
      <RuntimeStatus state={runtimeState} />
      
      {/* Show accumulated execution log */}
      <ExecutionLog logs={logs} />
    </div>
  )
}
```

## Type Definitions

Full type definitions are available in `@perstack/core`:

```typescript
import type {
  PerstackEvent,
  RunEvent,
  RuntimeEvent,
  EventType,
  RuntimeEventType,
  EventForType,
  RuntimeEventForType,
} from "@perstack/core"

// Type guard functions
const isRunEvent = (event: PerstackEvent): event is RunEvent =>
  "expertKey" in event

const isRuntimeEvent = (event: PerstackEvent): event is RuntimeEvent =>
  !("expertKey" in event)
```

