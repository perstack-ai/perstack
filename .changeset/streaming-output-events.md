---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/claude-code": minor
"@perstack/cursor": minor
"@perstack/docker": minor
"@perstack/gemini": minor
"@perstack/runner": minor
"@perstack/filesystem-storage": minor
"@perstack/mock": minor
"perstack": minor
"create-expert": minor
---

Add streaming output events for real-time LLM output display

- New event types: `startReasoning`, `streamReasoning`, `startRunResult`, `streamRunResult`
- Fire-and-forget streaming events emitted during LLM generation
- TUI displays streaming reasoning and run results in real-time
- Reasoning phase properly completes before result phase
- Added retry count tracking with configurable limit via `maxRetries`
- TUI now displays retry events with reason
