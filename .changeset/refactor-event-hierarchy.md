---
"@perstack/core": patch
"@perstack/react": patch
"@perstack/runtime": patch
"@perstack/base": patch
"@perstack/cursor": patch
"@perstack/gemini": patch
"@perstack/claude-code": patch
"@perstack/docker": patch
"@perstack/runner": patch
"@perstack/filesystem-storage": patch
"@perstack/s3-compatible-storage": patch
"@perstack/s3-storage": patch
"@perstack/r2-storage": patch
"@perstack/provider-core": patch
"@perstack/google-provider": patch
"@perstack/deepseek-provider": patch
"@perstack/bedrock-provider": patch
"@perstack/azure-openai-provider": patch
"@perstack/anthropic-provider": patch
"@perstack/vertex-provider": patch
"@perstack/ollama-provider": patch
"@perstack/openai-provider": patch
"@perstack/mock": patch
"@perstack/api-client": patch
"perstack": patch
"create-expert": patch
---

Refactor event type hierarchy to fix reasoning misattribution in parallel runs (#281)

**Breaking Changes:**

- Renamed `CheckpointAction` to `Activity` with integrated metadata (`id`, `expertKey`, `runId`, `previousActivityId`, `delegatedBy`)
- Moved streaming events from `RuntimeEvent` to `RunEvent` (now `StreamingEvent`)
- Renamed streaming event types:
  - `startReasoning` → `startStreamingReasoning`
  - `completeReasoning` → `completeStreamingReasoning`
  - `startRunResult` → `startStreamingRunResult`
  - Added `completeStreamingRunResult`
- Removed deprecated `streamingText` event
- `@perstack/react`: Renamed `useLogStore` → `useRun`, `useRuntimeState` → `useRuntime`
- `@perstack/react`: Changed return type from `logs: LogEntry[]` to `activities: Activity[]`

**Migration:**

```typescript
// Before
import { useLogStore, LogEntry, CheckpointAction } from "@perstack/react"
const { logs } = useLogStore()

// After
import { useRun, Activity } from "@perstack/react"
const { activities } = useRun()
```
