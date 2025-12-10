# @perstack/gemini

Gemini CLI runtime adapter for Perstack.

This package provides the `GeminiAdapter` for running Perstack Experts using the Gemini CLI.

## Installation

```bash
npm install @perstack/gemini
```

## Prerequisites

- Gemini CLI installed
- `GEMINI_API_KEY` environment variable set

## Usage

```typescript
import { GeminiAdapter } from "@perstack/gemini"
import { registerAdapter, getAdapter } from "@perstack/runtime"

// Register the adapter
registerAdapter("gemini", () => new GeminiAdapter())

// Use the adapter
const adapter = getAdapter("gemini")
const prereq = await adapter.checkPrerequisites()
if (prereq.ok) {
  const result = await adapter.run({ setting, eventListener })
}
```

## CLI Usage

```bash
npx perstack run my-expert "query" --runtime gemini
```

## Limitations

- MCP tools are not supported (Gemini CLI has no MCP)
- Use Gemini's built-in file/shell capabilities instead
- Delegation is instruction-based (LLM decides)

## Related Documentation

- [Multi-Runtime Support](https://docs.perstack.ai/using-experts/multi-runtime)
- [Running Experts](https://docs.perstack.ai/using-experts/running-experts)
