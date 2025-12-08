---
"@perstack/core": patch
"@perstack/runtime": patch
"@perstack/api-client": patch
"@perstack/base": patch
"@perstack/tui": patch
"perstack": patch
---

Add parallel tool call support and mixed tool call handling

Features:

- Process all tool calls from a single LLM response instead of only the first one
- MCP tools execute in parallel using `Promise.all`
- Support mixed tool calls (MCP + Delegate + Interactive in same response)
- Process tools in priority order: MCP → Delegate → Interactive
- Preserve partial results across checkpoint boundaries

Schema Changes:

- `Step.toolCall` → `Step.toolCalls` (array)
- `Step.toolResult` → `Step.toolResults` (array)
- Add `Step.pendingToolCalls` for tracking unprocessed tool calls
- Add `Checkpoint.pendingToolCalls` and `Checkpoint.partialToolResults` for resume

Event Changes:

- `callTool` → `callTools`
- `resolveToolResult` → `resolveToolResults`
- Add `resumeToolCalls` and `finishAllToolCalls` events

