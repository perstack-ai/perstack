# @perstack/react

React hooks and utilities for Perstack integration.

## Installation

```bash
npm install @perstack/react
# or
pnpm add @perstack/react
```

## Usage

### useLogStore

The main hook for managing Perstack events. It separates events into:
- **LogEntry[]** - Accumulated log from RunEvent (state machine transitions)
- **RuntimeState** - Current state from RuntimeEvent (runtime environment)

```tsx
import { useLogStore } from "@perstack/react"

function MyComponent() {
  const { logs, runtimeState, isComplete, eventCount, addEvent, appendHistoricalEvents } =
    useLogStore()

  // Add events from your event source
  useEffect(() => {
    const eventSource = new EventSource("/api/events")
    eventSource.onmessage = (e) => {
      addEvent(JSON.parse(e.data))
    }
    return () => eventSource.close()
  }, [addEvent])

  return (
    <div>
      {logs.map((entry) => (
        <LogRow key={entry.id} action={entry.action} />
      ))}
      {runtimeState.streaming.isReasoningActive && (
        <div>Reasoning: {runtimeState.streaming.reasoning}</div>
      )}
      {runtimeState.streaming.isRunResultActive && (
        <div>Generating: {runtimeState.streaming.runResult}</div>
      )}
    </div>
  )
}
```

### useRuntimeState

A lower-level hook for managing RuntimeState separately.

```tsx
import { useRuntimeState } from "@perstack/react"

function MyComponent() {
  const { runtimeState, handleRuntimeEvent, clearStreaming, resetRuntimeState } = useRuntimeState()

  // Returns true if the event was handled (RuntimeEvent)
  // Returns false if the event should be processed elsewhere (RunEvent)
  const wasHandled = handleRuntimeEvent(event)
}
```

### Utility Functions

For advanced use cases, you can use the utility functions directly:

```tsx
import {
  createInitialLogProcessState,
  processRunEventToLog,
  toolToCheckpointAction,
} from "@perstack/react"

// Create processing state
const state = createInitialLogProcessState()

// Process RunEvent into LogEntry
const logs = []
processRunEventToLog(state, event, (entry) => logs.push(entry))

// Convert a single tool call + result to CheckpointAction
const action = toolToCheckpointAction(toolCall, toolResult, reasoning)
```

## API

### useLogStore()

Returns an object with:

- `logs`: Array of `LogEntry` representing completed actions (append-only)
- `runtimeState`: Current `RuntimeState` including streaming state
- `isComplete`: Whether the run is complete
- `eventCount`: Total number of processed events
- `addEvent(event)`: Add a new event to process
- `appendHistoricalEvents(events)`: Append historical events to logs

**Note:** Logs are append-only and never cleared. This is required for compatibility with Ink's `<Static>` component.

### useRuntimeState()

Returns an object with:

- `runtimeState`: Current `RuntimeState`
- `handleRuntimeEvent(event)`: Process a RuntimeEvent, returns `true` if handled
- `clearStreaming()`: Reset streaming state
- `resetRuntimeState()`: Reset entire runtime state

## Types

### LogEntry

Wraps `CheckpointAction` with an ID for React key purposes:

```typescript
type LogEntry = {
  id: string
  action: CheckpointAction
}
```

### RuntimeState

Captures current runtime environment state:

```typescript
type RuntimeState = {
  query?: string
  expertName?: string
  model?: string
  runtime?: string
  runtimeVersion?: string
  skills: Map<string, SkillState>
  dockerBuild?: DockerBuildState
  dockerContainers: Map<string, DockerContainerState>
  proxyAccess?: ProxyAccessState
  streaming: StreamingState
}
```

### StreamingState

Real-time streaming state:

```typescript
type StreamingState = {
  reasoning?: string
  runResult?: string
  isReasoningActive?: boolean
  isRunResultActive?: boolean
}
```

## License

Apache-2.0
