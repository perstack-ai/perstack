---
"@perstack/core": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/claude-code": minor
"@perstack/cursor": minor
"@perstack/docker": minor
"@perstack/gemini": minor
"@perstack/mock": minor
"@perstack/runner": minor
"@perstack/runtime": minor
"@perstack/filesystem-storage": minor
"@perstack/tui": minor
"@perstack/e2e-mcp-server": minor
"perstack": minor
"create-expert": minor
---

feat: add granular timing metrics to MCP skill initialization

The `skillConnected` runtime event now includes detailed timing breakdown:

- `spawnDurationMs` - Time to create transport and spawn process
- `handshakeDurationMs` - Time for MCP protocol handshake (connect)
- `toolDiscoveryDurationMs` - Time for listTools() call

These metrics help identify performance bottlenecks in MCP skill startup.

**Breaking behavior change**: The semantics of existing fields have changed:
- `connectDurationMs` now equals `spawnDurationMs + handshakeDurationMs` (previously measured only `connect()` call)
- `totalDurationMs` now includes `toolDiscoveryDurationMs` (previously captured before `listTools()`)

Example event output:
```json
{
  "type": "skillConnected",
  "skillName": "@perstack/base",
  "spawnDurationMs": 150,
  "handshakeDurationMs": 8500,
  "toolDiscoveryDurationMs": 1100,
  "connectDurationMs": 8650,
  "totalDurationMs": 9750
}
```

Relates to #201
