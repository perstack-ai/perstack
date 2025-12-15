# @perstack/claude-code

Claude Code runtime adapter for Perstack.

This package provides the `ClaudeCodeAdapter` for running Perstack Experts using the Claude Code CLI.

## Installation

```bash
npm install @perstack/claude-code
```

## Prerequisites

- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Authenticated via `claude` command

## Usage

```typescript
import { ClaudeCodeAdapter } from "@perstack/claude-code"
import { registerAdapter, getAdapter } from "@perstack/runtime"

// Register the adapter
registerAdapter("claude-code", () => new ClaudeCodeAdapter())

// Use the adapter
const adapter = getAdapter("claude-code")
const prereq = await adapter.checkPrerequisites()
if (prereq.ok) {
  const result = await adapter.run({ setting, eventListener })
}
```

## CLI Usage

```bash
npx perstack run my-expert "query" --runtime claude-code
```

## Limitations

- Skills from `perstack.toml` are not injectable (Claude Code uses its own MCP config)
- Configure MCP servers separately via `claude mcp`
- Delegation is instruction-based (LLM decides)

## Related Documentation

- [Multi-Runtime Support](https://github.com/perstack-ai/perstack/blob/main/docs/using-experts/multi-runtime.md)
- [Running Experts](https://github.com/perstack-ai/perstack/blob/main/docs/using-experts/running-experts.md)
