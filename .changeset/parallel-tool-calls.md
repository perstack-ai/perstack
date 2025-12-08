---
"@perstack/core": patch
"@perstack/runtime": patch
"@perstack/api-client": patch
"@perstack/base": patch
"@perstack/tui": patch
"perstack": patch
---

Add parallel tool call support

The runtime now processes all tool calls from a single LLM response in parallel using `Promise.all`, instead of processing only the first one. This improves efficiency when models request multiple independent tool executions.

- `Step.toolCall` → `Step.toolCalls` (array)
- `Step.toolResult` → `Step.toolResults` (array)
- `callTool` event → `callTools` event
- `resolveToolResult` event → `resolveToolResults` event

