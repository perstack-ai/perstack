---
"@perstack/core": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/runtime": minor
"@perstack/e2e-mcp-server": minor
"perstack": minor
"create-expert": minor
---

feat: add granular timing metrics to MCP skill initialization

The `skillConnected` runtime event now includes detailed timing breakdown:

- `spawnDurationMs` - Time to create transport and spawn process
- `handshakeDurationMs` - Time for MCP protocol handshake (connect)
- `toolDiscoveryDurationMs` - Time for listTools() call

These metrics help identify performance bottlenecks in MCP skill startup. The existing `connectDurationMs` and `totalDurationMs` fields are preserved for backward compatibility.

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
