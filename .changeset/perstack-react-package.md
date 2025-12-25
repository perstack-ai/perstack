---
"@perstack/react": patch
"@perstack/core": patch
"perstack": patch
---

Create @perstack/react package for React integration

- Added `@perstack/react` package with React hooks for Perstack integration
- Added `useLogStore` hook for managing log entries from RunEvent stream (append-only, Static-compatible)
- Added `useRuntimeState` hook for managing runtime state from RuntimeEvent stream
- Added `LogEntry` and `RuntimeState` types for React integration
- Added `processRunEventToLog` and `toolToCheckpointAction` utilities
- Added `CheckpointActionQuery` type to `@perstack/core` for user input queries
- Added `PerstackEvent` union type to `@perstack/core`
- Refactored TUI to consume `@perstack/react` for state management
- Fixed `attemptCompletion` and `todo` action rendering to always display status
- Eliminated duplicate logic between TUI and `@perstack/core`'s `getCheckpointActions`
