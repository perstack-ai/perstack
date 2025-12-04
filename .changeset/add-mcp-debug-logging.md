---
"@perstack/core": patch
"@perstack/runtime": patch
---

Add skill lifecycle events for MCP startup debugging

- Add `skillStarting` event with command and args
- Add `skillStderr` event for child process stderr output
- Add `connectDurationMs` and `totalDurationMs` to `skillConnected` event
