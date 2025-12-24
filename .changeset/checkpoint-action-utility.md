---
"@perstack/core": patch
---

Add getCheckpointAction utility function for checkpoint action interpretation

- Added CheckpointAction types for 20 action types (attemptCompletion, think, todo, file operations, delegate, etc.)
- Added getCheckpointAction(checkpoint, step) utility to compute checkpoint actions on-demand
- Exported from @perstack/core for use by consumers

