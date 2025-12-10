# @perstack/cursor

Cursor runtime adapter for Perstack.

This package provides the `CursorAdapter` for running Perstack Experts using the Cursor IDE headless CLI.

## Installation

```bash
npm install @perstack/cursor
```

## Prerequisites

- Cursor CLI installed (`cursor-agent`)
- `CURSOR_API_KEY` environment variable (for some operations)

## Usage

```typescript
import { CursorAdapter } from "@perstack/cursor"
import { registerAdapter, getAdapter } from "@perstack/runtime"

// Register the adapter
registerAdapter("cursor", () => new CursorAdapter())

// Use the adapter
const adapter = getAdapter("cursor")
const prereq = await adapter.checkPrerequisites()
if (prereq.ok) {
  const result = await adapter.run({ setting, eventListener })
}
```

## CLI Usage

```bash
npx perstack run my-expert "query" --runtime cursor
```

## Limitations

- MCP tools from `perstack.toml` are not available (Cursor headless mode has no MCP)
- Only built-in Cursor capabilities (file read/write, shell commands) are available
- Delegation is instruction-based (LLM decides)

## Related Documentation

- [Multi-Runtime Support](https://docs.perstack.ai/using-experts/multi-runtime)
- [Running Experts](https://docs.perstack.ai/using-experts/running-experts)
