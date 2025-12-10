# @perstack/runner

Multi-runtime adapter orchestration for Perstack.

This package provides a unified interface to dispatch Expert execution across multiple runtimes (Perstack, Cursor, Claude Code, Gemini).

## Installation

```bash
npm install @perstack/runner
```

## Usage

```typescript
import { dispatchToRuntime, getRegisteredRuntimes } from "@perstack/runner"

// Check available runtimes
console.log(getRegisteredRuntimes()) // ["perstack", "cursor", "claude-code", "gemini"]

// Dispatch to a runtime
const result = await dispatchToRuntime({
  setting: { ... },
  runtime: "cursor",
  eventListener: (event) => console.log(event),
})
```

## Supported Runtimes

| Runtime | Package | Description |
|---------|---------|-------------|
| `perstack` | `@perstack/runtime` | Built-in Perstack runtime |
| `cursor` | `@perstack/cursor` | Cursor IDE headless mode |
| `claude-code` | `@perstack/claude-code` | Claude Code CLI |
| `gemini` | `@perstack/gemini` | Gemini CLI |

## API

### `dispatchToRuntime(params)`

Dispatches Expert execution to the specified runtime.

### `getAdapter(runtime)`

Returns the adapter instance for the specified runtime.

### `isAdapterAvailable(runtime)`

Checks if a runtime adapter is available.

### `getRegisteredRuntimes()`

Returns a list of all registered runtime names.

## Related Documentation

- [Multi-Runtime Support](https://docs.perstack.ai/using-experts/multi-runtime)
