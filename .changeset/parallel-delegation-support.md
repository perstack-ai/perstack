---
"@perstack/core": minor
"@perstack/react": minor
"@perstack/runtime": minor
"perstack": minor
---

Add parallel delegation support to TUI

- Add `delegationComplete` checkpoint action type for tracking when all delegations return
- Add `runId` to `delegatedBy` for better delegation traceability
- Log delegate tool calls immediately at `callDelegate` event (don't wait for results)
- Add `groupLogsByRun` utility for grouping log entries by run
- Update TUI to visually group log entries by run with headers for delegated runs
- Fix `runId` generation to ensure new IDs for delegation, continuation, and delegation return
- Make `runId` internal-only (not configurable via CLI)
