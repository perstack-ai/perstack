---
"@perstack/runtime": patch
---

Refactored packages/runtime with clean architecture patterns following packages/docker design:

- Introduced `tool-execution/` module with Strategy pattern for tool execution
  - `ToolExecutor` interface and `McpToolExecutor` implementation
  - `ToolExecutorFactory` for creating executors
  - `tool-classifier.ts` to eliminate duplicate `getToolType` functions

- Introduced `orchestration/` module to decompose run.ts
  - `RunOrchestrator` class for run loop control
  - `DelegationHandler` class for delegation logic separation

- Simplified `run.ts` from 230+ lines to a thin facade
- Reduced `calling-tool.ts` complexity by extracting tool execution logic
- Eliminated code duplication between `calling-tool.ts` and `calling-delegate.ts`
