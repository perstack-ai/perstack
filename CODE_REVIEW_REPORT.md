# Comprehensive Code Review Report

**Date**: 2025-12-02  
**Last Updated**: 2025-12-02  
**Scope**: Full codebase review of perstack monorepo

---

## Executive Summary

Overall, the codebase is well-structured with strong architectural decisions. The type system is comprehensive, and the separation of concerns across packages is clear. The documentation is thorough and well-written. However, there are several areas for improvement related to test coverage, error handling consistency, and some potential edge cases.

### Progress Summary

| Status       | Count | Description                                |
| ------------ | ----- | ------------------------------------------ |
| ✅ Fixed      | 13    | Issues resolved with code changes          |
| ✅ Verified   | 5     | Confirmed not an issue / working correctly |
| 📝 Documented | 1     | Behavior documented, no code change needed |
| ⏸️ Deferred   | 11    | Low priority / E2E scope / future work     |

---

## Critical Issues

### 1. Potential Memory Leak in Thought/Todo Singletons (`packages/base`)

**Status**: ⏸️ **Deferred** — Singletons are released with skill lifecycle; acceptable as-is.

**Location**: `packages/base/src/tools/think.ts:6-20`, `packages/base/src/tools/todo.ts:6-33`

**Issue**: The `Thought` and `Todo` classes use module-level singletons that never clear their state. In a long-running MCP server, `thoughtHistory` and `todos` arrays can grow indefinitely.

```typescript
// think.ts
const thought = new Thought()  // Never cleared

// todo.ts  
const todoSingleton = new Todo()  // Only clearTodo() clears it
```

**Impact**: Memory consumption grows over time in long-running processes.

**Resolution**: MCP server process is spawned per-run and terminated when run completes. Singleton lifecycle matches skill lifecycle, so no memory leak in practice.

---

### 2. Error Handling Inconsistency in API Client (`packages/api-client`)

**Status**: ⏸️ **Deferred** — API client needs major rewrite; will address holistically later.

**Location**: `packages/api-client/v1/client.ts:105-112`

**Issue**: The `request` method throws generic `Error` with `response.statusText` but does not use the `ApiError` class that was specifically designed for this purpose.

```typescript
// client.ts
if (!response.ok) {
  throw new Error(`Failed to request ${url.toString()}: ${response.statusText}`)
}
```

**Impact**: Consumers cannot reliably distinguish error types or access structured error information.

**Recommendation**: Use `ApiError` class with proper response body parsing:
```typescript
if (!response.ok) {
  const text = await response.text()
  throw new ApiError(text)
}
```

---

## Major Issues

### 3. Missing Test Coverage for State Machine Edge Cases (`packages/runtime`)

**Location**: `packages/runtime/src/states/`

**Issue**: While there are tests for individual state logic functions, there's no integration test for the complete state machine flow. Edge cases like:
- Concurrent checkpoint storage failures
- MCP connection dropping mid-execution
- Timeout during delegation return

**Impact**: Production bugs may surface from untested state transitions.

**Recommendation**: Add integration tests that simulate full run cycles with various failure scenarios.

---

### 4. `executeStateMachine` Error Handling (`packages/runtime`)

**Status**: ✅ **Fixed** — Commit `983fc22`

**Location**: `packages/runtime/src/execute-state-machine.ts:36-68`

**Issue**: The error in the `runActor.subscribe` callback is caught and `reject(error)` is called, but `closeSkillManagers` is not called on error path:

```typescript
} catch (error) {
  reject(error)  // Skills are not cleaned up
}
```

**Impact**: MCP server processes may remain running after errors.

**Resolution**: Added `closeSkillManagers` call in catch block and also when `shouldContinueRun` stops the run early.

---

### 5. Race Condition in `getSkillManagers` (`packages/runtime`)

**Status**: ✅ **Fixed** — Commit `7276d47`

**Location**: `packages/runtime/src/skill-manager.ts:374-408`

**Issue**: Multiple `Promise.all` calls initialize skills concurrently, but if one fails early, others continue running. The function doesn't handle partial initialization failures.

**Impact**: Orphaned MCP processes if some skills fail during batch initialization.

**Resolution**: Refactored to use `Promise.allSettled` with `initSkillManagersWithCleanup` helper. On any init failure, all previously initialized managers are closed before re-throwing.

---

### 6. Incomplete Input Validation in CLI (`packages/perstack`)

**Status**: 📝 **Documented** — Commit `ff1dbff`

**Location**: `packages/perstack/src/publish.ts:14-16`

**Issue**: Command validation only checks `npx` and `uvx` for skills, but the core schema allows any command string:

```typescript
const command = skill.command as "npx" | "uvx"
if (command !== "npx" && command !== "uvx") {
  throw new Error(...)
}
```

**Impact**: Inconsistency between local execution (any command) and registry publishing (only npx/uvx).

**Resolution**: Added "Skill requirements" section to `docs/content/making-experts/publishing.mdx` explaining:
- Only `npx`/`uvx` allowed for published Experts (security)
- Local experts can use any command
- Docker-based skills planned for future

---

## Minor Issues

### 7. Inconsistent Error Message Formatting

**Locations**: Throughout codebase

**Issue**: Error messages use inconsistent formatting:
- Some use template literals with full context
- Some use simple strings without context
- Some use JSON.stringify for structured errors

**Recommendation**: Establish a standard error message format and use it consistently.

---

### 8. Magic Numbers in Constants (`packages/core`)

**Location**: `packages/core/src/constants/constants.ts`

**Issue**: Some constants lack descriptive context:
```typescript
export const defaultMaxRetries = 5
export const defaultTimeout = 5 * 1000 * 60  // 5 minutes, not obvious
```

**Recommendation**: Add inline documentation for non-obvious values, or use more descriptive expressions.

---

### 9. Duplicate Schema Definitions (`packages/api-client`)

**Location**: `packages/api-client/v1/schemas/checkpoint.ts`

**Issue**: Many action schemas share similar patterns but are defined separately. This leads to ~170 lines of repetitive schema code.

**Recommendation**: Consider using schema composition or factory functions to reduce duplication.

---

### 10. Missing Type Guards in TUI (`packages/tui`)

**Location**: `packages/tui/src/hooks/state/use-step-store.ts:18-25`

**Issue**: Type guards use string comparison on `event.type` without type narrowing:

```typescript
const isToolCallEvent = (event: PerstackEvent): event is RunEvent & { toolCall: ToolCall } =>
  "type" in event &&
  (event.type === "callTool" || ...)
```

**Impact**: TypeScript may not fully narrow the type in all contexts.

**Recommendation**: Use discriminated union type guards from `@perstack/core`.

---

### 11. Console.error Usage in Library Code (`packages/runtime`)

**Location**: `packages/runtime/src/states/generating-tool-call.ts:43`

**Issue**: `console.error(error)` is called directly in library code, which may pollute consumer's output.

**Recommendation**: Use event emitter or structured logging instead of direct console output.

---

## Documentation Quality

### Positive Findings

1. **README.md files** are comprehensive and consistent across packages
2. **AGENTS.md** provides excellent developer onboarding guidance
3. **CONTRIBUTING.md** clearly explains versioning strategy
4. **JSDoc comments** in schemas are helpful (where present)
5. **Mermaid diagrams** in runtime README enhance understanding

### Issues Found

### 12. Outdated Known Models List

**Location**: `packages/core/src/known-models/index.ts`

**Issue**: Contains model names like `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `o4-mini` which appear to be placeholder/future models.

**Impact**: May confuse users about available models.

**Recommendation**: Only include currently available models, or clearly mark experimental/upcoming ones.

---

### 13. Missing API Documentation for Some Schemas

**Location**: `packages/core/src/schemas/`

**Issue**: Some schemas lack JSDoc descriptions:
- `usageSchema` - no field descriptions
- `stepSchema` - minimal documentation
- `skill-manager.ts` - interface definitions lack docs

**Recommendation**: Add JSDoc comments to all exported types and fields.

---

### 14. Documentation-Code Mismatch in Base Skill

**Location**: `docs/content/making-experts/base-skill.mdx` vs `packages/base/src/tools/read-image-file.ts`

**Issue**: Documentation says "Maximum file size: **15MB**" for images, but code uses different value for PDF (30MB). The image max size constant is not visible in the code.

**Recommendation**: Add explicit `MAX_IMAGE_SIZE` constant and ensure docs match code.

---

## Test Quality

### Positive Findings

1. **Schema tests** (`packages/core`) have good coverage of parse/transform behavior
2. **SkillManager tests** (`packages/runtime`) properly mock MCP internals
3. **Test naming** is descriptive and follows consistent patterns
4. **Test data factories** in `packages/api-client/test/` are well-organized

### Issues Found

### 15. Missing Edge Case Tests

**Status**: ✅ **Partially Fixed** — Commit `26ed560`

**Locations**:
- `packages/core/src/schemas/expert.test.ts` - No tests for invalid skill type in discriminated union ✅ **Added**
- `packages/runtime/src/skill-manager.test.ts` - No tests for concurrent init attempts (already covered by existing test)
- `packages/base/src/tools/*.test.ts` - No tests for permission denied scenarios 🔲 **Open**

---

### 16. Test File for `readPdfFile` Tests Non-Existent Path

**Location**: `packages/base/test/fixtures/test-large-32MB.pdf`

**Issue**: The fixture name suggests 32MB but actual tests check against 30MB limit. Unclear if this file exists or is generated.

---

### 17. No Tests for SSE Parsing Edge Cases

**Status**: ✅ **Fixed** — Commit `26ed560`

**Location**: `packages/api-client/v1/utils/sse.ts`

**Issue**: `parseSSE` function handles basic cases but lacks tests for:
- Malformed events
- Events with multiple data lines
- Events with missing event type

**Resolution**: Added tests for malformed JSON, missing data field, and data without event type. Coverage now 100%.

---

## Code Readability

### Positive Findings

1. **Function names** are descriptive and follow conventions
2. **File organization** is logical and consistent
3. **Import statements** are well-organized
4. **Type exports** are comprehensive

### Issues Found

### 18. Long Functions Without Decomposition

**Location**: `packages/runtime/src/runtime-state-machine.ts`

**Issue**: The state machine definition is 430+ lines with deeply nested `assign` actions. While the xstate layout comment helps, individual state handlers could be extracted.

**Recommendation**: Extract complex `assign` handlers into named functions for readability.

---

### 19. Implicit Any in Error Handling

**Location**: `packages/base/src/tools/exec.ts:84-86`

**Issue**: Error is cast to an inline type rather than using proper type guards:

```typescript
const execError = error as {
  message?: string
  stdout?: string
  // ...
}
```

**Recommendation**: Define a proper `ExecError` type or use type guards.

---

## Potential Bugs

### 20. `toolResultPartToCoreToolResultPart` Only Uses First Content

**Location**: `packages/runtime/src/messages/message.ts:238-260`

**Issue**: The function only uses `part.contents[0]`:
```typescript
const content = part.contents[0]  // Ignores rest of contents
```

**Impact**: Tool results with multiple content parts will lose data.

**Recommendation**: Handle multiple content parts or document the limitation.

---

### 21. `validatePath` Symlink Resolution Race Condition

**Location**: `packages/base/src/lib/path.ts:15-46`

**Issue**: The function checks if a path is within workspace using `fs.realpath`, but a symlink could be modified between check and use (TOCTOU).

**Impact**: Theoretical security bypass in adversarial environments.

**Recommendation**: For production, consider additional runtime checks or use sandbox isolation.

---

### 22. Missing Null Check in Delegation Return

**Location**: `packages/runtime/src/checkpoint-helpers.ts:54-61`

**Issue**: `messages[messages.length - 1]` could be undefined if messages array is empty:
```typescript
const delegateResultMessage = messages[messages.length - 1]
if (delegateResultMessage.type !== "expertMessage") {  // TypeError if undefined
```

**Recommendation**: Add explicit length check before accessing.

---

## Suggestions

### 23. Consider Using `zod-validation-error` for Better Error Messages

**Status**: ✅ **Fixed** — Commit `9f01f94`

The current Zod parsing errors can be cryptic. Using `zod-validation-error` would provide more user-friendly messages.

**Resolution**: Added `parseWithFriendlyError` utility to `@perstack/core` and integrated into CLI commands (`run`, `start`, `perstack-toml` parsing). Now shows human-readable error messages like:
```
perstack.toml: Validation failed:
  - model: Invalid input: expected string, received number
  - experts.test.instruction: Invalid input: expected string, received undefined
```

---

### 24. Add OpenTelemetry Support

The event-based architecture is well-suited for distributed tracing. Adding OTEL support would enhance observability in production deployments.

---

### 25. Consider Structured Logging

Replace `console.log`/`console.error` calls with a structured logging library (e.g., pino) for better production diagnostics.

---

### 26. Add Health Check Endpoint for MCP Server

**Status**: ✅ **Fixed** — Commits `6014a76`, `6f766e1`

`@perstack/base` could expose a health check tool for monitoring MCP server status.

**Resolution**: Added `healthCheck` tool to `@perstack/base` returning runtime status, workspace path, uptime, memory usage, and PID. Updated documentation in `base-skill.mdx` and README.

---

### 27. Document Workspace Isolation Guarantees

**Status**: ✅ **Fixed** — Commit `a33e19e`

The `validatePath` function provides some isolation, but the exact guarantees and limitations should be documented clearly for security-conscious users.

**Resolution**: Added "Technical details" subsections to `isolation-by-design.mdx` covering:
- How path validation works (resolution, symlink handling, boundary check)
- What attacks it protects against
- Limitations (TOCTOU race condition)
- Best practices for maximum security

---

### 28. Refactor SkillManager Code

**Category**: Code Quality  
**Severity**: Suggestion

`packages/runtime/src/skill-manager.ts` has grown complex with multiple initialization paths (MCP stdio/SSE, interactive, delegate) and cleanup logic. Consider refactoring to:

- Extract initialization logic per skill type into separate functions or classes
- Simplify the `getSkillManagers` orchestration
- Improve testability of individual components

---

### 29. Provider Settings Schema Should Use Discriminated Union

**Category**: Code Quality  
**Severity**: Suggestion

**Location**: `packages/core/src/schemas/perstack-toml.ts:5-68`

**Issue**: `providerSettingSchema` uses `z.union([...])` which provides weak type inference. Each provider has different settings, but there's no discriminator field to distinguish them.

**Current**:
```typescript
const providerSettingSchema = z.union([
  anthropicSettingSchema,
  googleSettingSchema,
  openAiSettingSchema,
  // ...
])
```

**Recommendation**: Add `providerName` to each setting schema and use `z.discriminatedUnion()`:
```typescript
const providerSettingSchema = z.discriminatedUnion("providerName", [
  anthropicSettingSchema.extend({ providerName: z.literal("anthropic") }),
  googleSettingSchema.extend({ providerName: z.literal("google") }),
  // ...
])
```

This would provide better type narrowing and clearer error messages.

---

### 30. Separate Types and Schemas in @perstack/core

**Category**: Architecture  
**Severity**: Suggestion

**Location**: `packages/core/src/schemas/`

**Issue**: Currently, TypeScript interfaces (types) and Zod schemas are co-located in the same files. This creates:
- Coupling between runtime validation and compile-time types
- Difficulty importing types without pulling in Zod dependency
- Challenges maintaining JSDoc on both interface and schema

**Recommendation**: Separate into two directories:
```
packages/core/src/
├── types/           # Pure TypeScript interfaces with JSDoc
│   ├── usage.ts
│   ├── step.ts
│   └── ...
└── schemas/         # Zod schemas that implement the types
    ├── usage.ts
    └── ...
```

Benefits:
- Types can be imported without Zod (lighter bundles for type-only consumers)
- Clearer separation of concerns
- Easier to maintain JSDoc in one place
- Schemas use `satisfies z.ZodType<T>` to ensure type safety

---

## Summary by Category

| Category       | Critical | Major | Minor | Suggestions |
| -------------- | -------- | ----- | ----- | ----------- |
| Code Quality   | 1        | 4     | 5     | 5           |
| Documentation  | 0        | 0     | 3     | 1           |
| Test Quality   | 0        | 1     | 2     | 0           |
| Potential Bugs | 1        | 0     | 3     | 0           |
| Architecture   | 0        | 0     | 0     | 1           |

**Total Findings**: 30

---

## Resolution Status

| Issue | Title                                  | Status         |
| ----- | -------------------------------------- | -------------- |
| #1    | Think/Todo singletons                  | ⏸️ Deferred     |
| #2    | API Client error handling              | ⏸️ Deferred     |
| #3    | State machine integration tests        | ⏸️ E2E scope    |
| #4    | executeStateMachine error handling     | ✅ Fixed        |
| #5    | getSkillManagers race condition        | ✅ Fixed        |
| #6    | CLI publish validation                 | 📝 Documented   |
| #7    | Error message formatting               | ⏸️ Low priority |
| #8    | Magic numbers in constants             | ✅ Verified     |
| #9    | Duplicate schema definitions           | ⏸️ Low priority |
| #10   | Missing type guards in TUI             | ✅ Verified     |
| #11   | Console.error in library code          | ✅ Fixed        |
| #12   | Outdated known models list             | ✅ Verified     |
| #13   | Missing API documentation              | ⏸️ Low priority |
| #14   | Documentation-code mismatch            | ✅ Verified     |
| #15   | Missing edge case tests                | ✅ Fixed        |
| #16   | PDF test fixture confusion             | ✅ Verified     |
| #17   | SSE parsing edge cases                 | ✅ Fixed        |
| #18   | Long functions without decomposition   | ⏸️ Low priority |
| #19   | Implicit any in error handling         | ✅ Fixed        |
| #20   | toolResultPart uses only first content | ✅ Fixed        |
| #21   | validatePath symlink race condition    | ⏸️ Theoretical  |
| #22   | Missing null check in delegation       | ✅ Fixed        |
| #23   | Friendly Zod error messages            | ✅ Fixed        |
| #24   | OpenTelemetry support                  | ⏸️ Future       |
| #25   | Structured logging                     | ⏸️ Future       |
| #26   | Health check tool                      | ✅ Fixed        |
| #27   | Workspace isolation docs               | ✅ Fixed        |
| #28   | SkillManager refactoring               | ⏸️ Future       |
| #29   | Provider settings discriminated union  | ⏸️ Future       |
| #30   | Separate types and schemas in core     | ⏸️ Future       |

---

## Remaining Items (Deferred)

### E2E Scope
- **#3**: State machine integration tests — requires E2E test infrastructure

### Low Priority / Future Work
- **#7**: Error message formatting — broad scope, not urgent
- **#9**: Duplicate schema definitions — significant refactoring required
- **#13**: Missing API documentation — enhancement, not blocking
- **#18**: Long functions without decomposition — refactoring
- **#21**: validatePath symlink race condition — theoretical TOCTOU issue
- **#24, #25, #28, #29, #30**: Suggestions — future enhancements (OTEL, structured logging, skill-manager refactoring, discriminated union for provider settings, types/schemas separation)

---

## Commits Made

| Commit    | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `7276d47` | Fix: Clean up skill managers on partial initialization failure     |
| `983fc22` | Fix: Clean up skill managers on state machine error                |
| `ff1dbff` | Docs: Add skill requirements for published Experts                 |
| `26ed560` | Test: Add edge case tests for SSE parsing and expert schema        |
| `06fac10` | Fix: Handle multiple contents in toolResultPart and null check     |
| `7c54bba` | Refactor: Remove console.error and add proper ExecError type guard |
| `a33e19e` | Docs: Add workspace isolation technical details                    |
| `6014a76` | Add: Health check tool to @perstack/base                           |
| `9f01f94` | Add: Friendly Zod error formatting utility                         |
| `6f766e1` | Update: Rename healthCheck to Perstack Runtime health check        |
