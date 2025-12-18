---
"@perstack/runtime": patch
---

Refactored packages/runtime with clean architecture patterns following packages/docker design:

- Introduced `tool-execution/` module with Strategy pattern for tool execution
  - `ToolExecutor` interface and `McpToolExecutor` implementation
  - `ToolExecutorFactory` for creating executors
  - `tool-classifier.ts` to eliminate duplicate `getToolType` functions
  - Comprehensive unit tests (~94% coverage)

- Introduced `orchestration/` module with proper separation of concerns
  - `StepExecutor` class for single state machine execution (no recursion)
  - `DelegationStrategy` interface with `SingleDelegationStrategy` and `ParallelDelegationStrategy`
  - Clear boundary: `run.ts` owns the loop, `StepExecutor` handles single step
  - Comprehensive unit tests (~94% coverage)

- Simplified `run.ts` to own the run loop and delegation routing
- Reduced `calling-tool.ts` complexity by extracting tool execution logic
- Eliminated code duplication between `calling-tool.ts` and `calling-delegate.ts`
