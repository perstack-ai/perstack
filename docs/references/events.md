---
title: "Events Reference"
---

# Events Reference

Perstack emits events during Expert execution for observability and state management. This document explains the event system architecture and how to consume events.

## Event Types Overview

```
PerstackEvent = RunEvent | RuntimeEvent
RunEvent = ExpertStateEvent | StreamingEvent
```

| Event Type         | Purpose                           | Accumulation      |
| ------------------ | --------------------------------- | ----------------- |
| `ExpertStateEvent` | State machine transitions         | Accumulated log   |
| `StreamingEvent`   | Real-time streaming content       | Latest state only |
| `RuntimeEvent`     | Infrastructure-level side effects | Latest state only |

## RunEvent

RunEvent represents events related to a **Run** — the execution unit of an Expert. RunEvent includes both state machine transitions (`ExpertStateEvent`) and streaming events (`StreamingEvent`).

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

Steps and Checkpoints are designed to be **deterministic and observable** through the agent loop state machine. ExpertStateEvents represent transitions in this state machine. StreamingEvents provide real-time content during generation.

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

### ExpertStateEvent Types

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

### StreamingEvent Types

StreamingEvents provide real-time content during LLM generation. They include `expertKey` for proper attribution in parallel runs.

| Event Type                   | Description               | Key Payload |
| ---------------------------- | ------------------------- | ----------- |
| `startStreamingReasoning`    | Start of reasoning stream | (empty)     |
| `streamReasoning`            | Reasoning delta           | `delta`     |
| `completeStreamingReasoning` | Reasoning complete        | `text`      |
| `startStreamingRunResult`    | Start of result stream    | (empty)     |
| `streamRunResult`            | Result delta              | `delta`     |
| `completeStreamingRunResult` | Result complete           | `text`      |

### Processing RunEvents

ExpertStateEvents should be **accumulated** as execution history. StreamingEvents should be processed as **current state** for real-time display.

```typescript
// Example: Processing RunEvents
function processEvent(event: PerstackEvent) {
  if (!isRunEvent(event)) return
  
  // StreamingEvents for real-time display
  if (isStreamingEvent(event)) {
    switch (event.type) {
      case "streamReasoning":
        updateStreamingReasoning(event.delta)
        break
      case "streamRunResult":
        updateStreamingResult(event.delta)
        break
      // ... handle other streaming events
    }
    return
  }
  
  // ExpertStateEvents for execution log
  switch (event.type) {
    case "startRun":
      addActivity({ type: "query", text: extractQuery(event) })
      break
    case "callTools":
      addActivity({ type: "toolCall", tools: event.toolCalls })
      break
    case "completeRun":
      addActivity({ type: "complete", text: event.text })
      break
    // ... handle other events
  }
}
```

## RuntimeEvent

RuntimeEvent represents **infrastructure-level side effects** — the runtime environment state rather than the agent loop itself.

### Characteristics

- Only the **latest state matters** — past RuntimeEvents are not meaningful
- Includes infrastructure-level information (skills, Docker, proxy)
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

### Processing RuntimeEvents

RuntimeEvents should be processed as **current state** — only the latest value matters.

```typescript
// Example: Managing RuntimeEvent as current state
type RuntimeState = {
  skills: Map<string, SkillStatus>
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
    // ... handle other events
  }
  return state
}
```

## Activity

**Activity** provides a human-friendly abstraction for understanding Expert behavior. It combines the action data with metadata for tracking execution across multiple Runs.

### Why Activity?

A single Step may contain multiple actions:
- Parallel tool calls (e.g., reading multiple files simultaneously)
- Multiple delegations
- Tool calls followed by result processing

RunEvents capture every state transition, but for human users who want to understand "what did the Expert do?", this level of detail can be overwhelming. Activity extracts meaningful actions with full context.

### Structure

```typescript
type Activity = {
  /** Activity type (e.g., "readTextFile", "exec", "delegate") */
  type: string
  /** Unique identifier for this activity */
  id: string
  /** Expert that executed this action */
  expertKey: string
  /** Run ID this activity belongs to */
  runId: string
  /** Previous activity ID within the same Run (daisy chain) */
  previousActivityId?: string
  /** Parent Run information (for delegated Runs) */
  delegatedBy?: {
    expertKey: string
    runId: string
  }
  /** LLM's reasoning before this action (if available) */
  reasoning?: string
  // ... action-specific fields
}
```

### Activity Types

#### Lifecycle Activities

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

| Type                 | Description                |
| -------------------- | -------------------------- |
| `delegate`           | Delegate to another Expert |
| `delegationComplete` | All delegations returned   |
| `interactiveTool`    | Tool requiring user input  |
| `generalTool`        | Any other MCP tool call    |

### Daisy Chain Architecture

Activity uses a **two-level daisy chain** to maintain ordering:

1. **Within-Run ordering**: `previousActivityId` links activities in the same Run
2. **Cross-Run ordering**: `delegatedBy` links child Runs to their parent Run

This architecture supports:
- **Flat storage**: All activities in a single append-only array
- **Run isolation**: Each Run forms an independent chain via `previousActivityId`
- **Parallel delegation**: Multiple child Runs can share the same `delegatedBy.runId`
- **Flexible rendering**: Group by `runId`, or flatten with `expertKey` labels

### Example: Parallel Delegation

```
Run: parent-run (delegatedBy: undefined)
  activity-1 (prev: null)     → query: "Process data"
  activity-2 (prev: activity-1)  → readFile: config.json
  activity-3 (prev: activity-2)  → delegate: [child-math, child-text]

Run: child-math-run (delegatedBy: { expertKey: "parent", runId: "parent-run" })
  activity-4 (prev: null)     → query: "Calculate sum"
  activity-5 (prev: activity-4)  → complete: "Math result: 42"

Run: child-text-run (delegatedBy: { expertKey: "parent", runId: "parent-run" })
  activity-6 (prev: null)     → query: "Format text"
  activity-7 (prev: activity-6)  → complete: "Text result: hello"

Run: parent-run (resumed)
  activity-8 (prev: activity-3)  → complete: "All done"
```

### Use Cases

Activity is designed for:

1. **UI Display** — Show users what the Expert is doing in a clear, actionable format
2. **Interactive Sessions** — Help users understand Expert behavior for effective collaboration
3. **Logging** — Create human-readable execution logs
4. **Debugging** — Trace specific actions without parsing raw events

```typescript
// Example: Displaying activities in a UI
function ActivityLog({ activities }: { activities: Activity[] }) {
  return (
    <ul>
      {activities.map((activity) => (
        <li key={activity.id}>
          {activity.type === "readTextFile" && `📄 Read ${activity.path}`}
          {activity.type === "writeTextFile" && `✏️ Write ${activity.path}`}
          {activity.type === "exec" && `⚡ Run ${activity.command}`}
          {activity.type === "delegate" && `🤝 Delegate to ${activity.delegateExpertKey}`}
          {activity.type === "complete" && `✅ Complete: ${activity.text}`}
        </li>
      ))}
    </ul>
  )
}
```

## Architectural Distinction

### Primary vs Side Effects

| Aspect             | RunEvent (Primary)                | RuntimeEvent (Side Effect) |
| ------------------ | --------------------------------- | -------------------------- |
| **What it tracks** | State machine + streaming         | Runtime environment state  |
| **Accumulation**   | State: history, Streaming: latest | Only latest state matters  |
| **Determinism**    | State: deterministic              | Environment-dependent      |
| **Persistence**    | Stored with checkpoints           | Typically not persisted    |
| **Consumer use**   | Execution logs, replay, audit     | UI updates, monitoring     |

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
│  │           ExpertStateEvents                          │    │
│  │         (state transitions)                          │    │
│  │                                                      │    │
│  │           StreamingEvents                            │    │
│  │        (real-time content)                           │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│  ┌──────────────────────┼───────────────────────────────┐    │
│  │       Skills, Docker, Proxy                          │    │
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
      case "streamReasoning": return `[${expertKey}] Thinking: ${event.delta}`
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
import { useRun, useRuntime } from "@perstack/react"

function ExpertRunner() {
  // RunEvents → accumulated activities + streaming state
  const { activities, streaming, addEvent } = useRun()
  
  // RuntimeEvents → current runtime environment state
  const { runtimeState, handleRuntimeEvent } = useRuntime()

  const handleEvent = (event: PerstackEvent) => {
    // Try RuntimeEvent first (returns false if not handled)
    if (!handleRuntimeEvent(event)) {
      // Must be RunEvent, add to run state
      addEvent(event)
    }
  }

  return (
    <div>
      {/* Show current runtime state */}
      <RuntimeStatus state={runtimeState} />
      
      {/* Show streaming content */}
      {streaming.reasoning && <ReasoningDisplay text={streaming.reasoning} />}
      
      {/* Show accumulated activities */}
      <ActivityLog activities={activities} />
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
  ExpertStateEvent,
  StreamingEvent,
  RuntimeEvent,
  EventType,
  ExpertStateEventType,
  StreamingEventType,
  RuntimeEventType,
  EventForType,
  RuntimeEventForType,
  Activity,
} from "@perstack/core"

// Type guard functions
const isRunEvent = (event: PerstackEvent): event is RunEvent =>
  "expertKey" in event

const isStreamingEvent = (event: PerstackEvent): event is StreamingEvent =>
  "expertKey" in event && ["startStreamingReasoning", "streamReasoning", "completeStreamingReasoning", "startStreamingRunResult", "streamRunResult", "completeStreamingRunResult"].includes(event.type as string)

const isRuntimeEvent = (event: PerstackEvent): event is RuntimeEvent =>
  !("expertKey" in event)
```
