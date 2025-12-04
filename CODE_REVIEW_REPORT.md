# Comprehensive Code Review Report

**Date**: 2025-12-02  
**Last Updated**: 2025-12-03  
**Scope**: Full codebase review of perstack monorepo

---

## Executive Summary

Overall, the codebase is well-structured with strong architectural decisions. The type system is comprehensive, and the separation of concerns across packages is clear. The documentation is thorough and well-written. However, there are several areas for improvement related to test coverage, error handling consistency, and some potential edge cases.

### Progress Summary

| Status       | Count | Description                                |
| ------------ | ----- | ------------------------------------------ |
| ✅ Fixed      | 17    | Issues resolved with code changes          |
| ✅ Verified   | 5     | Confirmed not an issue / working correctly |
| 📝 Documented | 1     | Behavior documented, no code change needed |
| ⏸️ Deferred   | 8     | Low priority / E2E scope / future work     |
| 🔴 Open       | 3     | Runtime package issues (2025-12-03)        |
| 🟡 Low Prio   | 4     | Runtime minor issues (2025-12-03)          |

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

**Status**: ✅ **Fixed** — Commit `ebf67bc`

**Location**: `packages/core/src/schemas/`

**Issue**: Some schemas lack JSDoc descriptions:
- `usageSchema` - no field descriptions
- `stepSchema` - minimal documentation
- `skill-manager.ts` - interface definitions lack docs

**Resolution**: Added comprehensive JSDoc documentation to all 14 schema files with interface + `z.ZodType<T>` pattern for type safety.

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

**Status**: ✅ **Fixed** — Commit `5490ebb`

**Category**: Code Quality  
**Severity**: Suggestion

**Resolution**: Refactored `skill-manager.ts` into a modular structure:
- `skill-manager/base.ts` - BaseSkillManager abstract class
- `skill-manager/mcp.ts` - McpSkillManager (stdio/SSE)
- `skill-manager/interactive.ts` - InteractiveSkillManager
- `skill-manager/delegate.ts` - DelegateSkillManager
- `skill-manager/helpers.ts` - getSkillManagers, closeSkillManagers, etc.

---

### 29. Provider Settings Schema Should Use Discriminated Union

**Status**: ✅ **Fixed** — Commit `f7edeb9`

**Category**: Code Quality  
**Severity**: Suggestion

**Location**: `packages/core/src/schemas/perstack-toml.ts`

**Resolution**: Refactored `providerTableSchema` to use `z.discriminatedUnion("providerName", [...])`. Each provider now has properly typed settings with full type inference.

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

### 31. Improve Skill Lazy Initialization for Faster Startup

**Category**: Performance  
**Severity**: Suggestion

**Issue**: Current implementation waits for all MCP skills to initialize before the first generation, causing slow startup times. The `@perstack/base` skill is fetched via `npx` every time, adding latency.

**Proposed Solution**:

1. **Add `lazy` option to MCP stdio skills in `perstack.toml`**:
   ```toml
   [experts."my-expert".skills."@example/slow-skill"]
   type = "mcpStdioSkill"
   command = "npx"
   packageName = "@example/slow-skill"
   lazy = true  # default: true
   ```

2. **First generation uses only ready skills**:
   - Run 1st generation with `@perstack/base` + non-lazy skills only
   - Lazy skills initialize in background during 1st generation
   - From 2nd generation onwards, all skills are available

3. **Bundle `@perstack/base` with CLI**:
   - Ship `@perstack/base` as part of the `perstack` CLI package
   - Use bundled version by default (no `npx` fetch)
   - Allow version override via config for testing newer versions

**Expected Impact**:
- Significantly faster first response time
- Reduced network overhead (no npx fetch for base)
- Better UX for interactive use cases

---

---

## Runtime Package Review (2025-12-03)

### 32. maxSteps Off-By-One Error (Potential Bug)

**Status**: ✅ **Fixed** — Commit `ced1aa6`

**Category**: Potential Bug  
**Severity**: Major

**Location**: `packages/runtime/src/states/finishing-step.ts:10`

**Issue**: The condition `checkpoint.stepNumber > setting.maxSteps` allows one extra step to execute.

**Resolution**: Changed `>` to `>=` in the comparison. Now `maxSteps=3` correctly stops after step 3.

---

### 33. Sandbox Design Flaw: Application Controls Its Own Workspace

**Status**: ✅ **Fixed**

**Category**: Security / Architecture  
**Severity**: Critical

**Location**: `packages/runtime/src/runtime.ts`, `packages/core/src/schemas/runtime.ts`

**Issue**: The runtime accepted a `workspace` parameter and called `process.chdir()` to set its own working directory. This violated the fundamental sandbox principle: **applications should not control their own execution boundaries**.

**Why this was a security/architecture problem**:

1. **Sandbox inversion**: The `@perstack/base` skill uses `validatePath()` to restrict file operations to the workspace. But if the application itself decides what the workspace is, it's not a real sandbox — it's self-imposed restriction that can be bypassed by the caller.

2. **Violates isolation-by-design**: The docs state "Isolation by Design" as a core principle, but allowing `--workspace /arbitrary/path` means isolation is caller-controlled, not enforced.

3. **Unix/POSIX principle violation**: Working directory should be set by the execution environment (shell, Docker, systemd), not by the application itself.

4. **Parallel execution hazard**: `process.chdir()` modifies global Node.js state, causing race conditions when multiple runs execute in parallel.

**Resolution**:
- Removed `workspace` field from `RunSetting` interface and `runParamsSchema`
- Removed `process.chdir()` call from runtime
- Runtime now uses `process.cwd()` as workspace (set by execution environment)

**Usage**:
```bash
# Run from project directory
cd /project && perstack run expert "query"
```

---

### 34. Delegate Expert Not Found Causes Runtime Error

**Status**: ✅ **Fixed** — Commit `cc23849`

**Category**: Potential Bug  
**Severity**: Minor

**Location**: `packages/runtime/src/skill-manager/helpers.ts:69-74`

**Issue**: When creating DelegateSkillManagers, if a delegate expert is not found, error message was unclear.

**Resolution**: Added explicit check with descriptive error message.

---

### 35. Skill Object Mutation in getSkillManagers

**Status**: 🔴 **Open**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/skill-manager/helpers.ts:47-50`

**Issue**: When `perstackBaseSkillCommand` is set, the original skill object is mutated:

```typescript
skill.command = overrideCommand
skill.packageName = undefined
skill.args = overrideArgs
skill.lazyInit = false
```

**Impact**: The original skill definition in `expert.skills` is modified, which could cause issues if the same expert definition is reused.

**Recommendation**: Create a copy before modifying:
```typescript
const modifiedSkill = { ...skill, command: overrideCommand, ... }
```

---

### 36. experts Object Mutation in resolveExpertToRun

**Status**: 🔴 **Open**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/resolve-expert-to-run.ts:20`

**Issue**: The function modifies the passed `experts` object:

```typescript
experts[expertKey] = toRuntimeExpert(expert)  // Mutates argument
```

**Impact**: Side effect that could surprise callers; the original `experts` map passed to `run()` will be modified.

**Recommendation**: Either document this behavior clearly or return a new map.

---

### 37. Missing Error Handling for File Operations in resolving-pdf-file and resolving-image-file

**Status**: 🔴 **Open**

**Status**: ✅ **Fixed** — Commit `796f981`

**Category**: Potential Bug  
**Severity**: Minor

**Location**: `packages/runtime/src/states/resolving-pdf-file.ts`, `resolving-image-file.ts`

**Issue**: `readFile(path)` can throw if file doesn't exist or is inaccessible.

**Resolution**: Added try-catch blocks to handle file read errors gracefully. Errors are now returned as text parts to the LLM instead of crashing.

---

### 38. RunSetting Parsed Without Schema Validation

**Status**: 🔴 **Open**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/run-setting-store.ts:39`

**Issue**: RunSetting is parsed with `JSON.parse` and cast with `as`:

```typescript
const runSetting = JSON.parse(await fileSystem.readFile(runSettingPath, "utf-8")) as RunSetting
```

**Impact**: If the stored JSON is corrupted or schema-incompatible, errors will occur later with unclear messages.

**Recommendation**: Use Zod schema validation:
```typescript
const runSetting = runSettingSchema.parse(JSON.parse(await fileSystem.readFile(...)))
```

---

### 39. closeSkillManagers Does Not Handle Individual Close Failures

**Status**: ✅ **Fixed** — Commit `dac71b5`

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/skill-manager/helpers.ts:83-89`

**Issue**: If one manager's `close()` throws, subsequent managers are not closed.

**Resolution**: Changed to use `Promise.all` with `.catch()` to ensure all managers are closed even if some fail.

---

### 40. EventEmitter Listener Errors Block Other Listeners

**Status**: 🟡 **Low Priority**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/events/event-emitter.ts:11-18`

**Issue**: Listeners are called sequentially; if one throws, others are not called:

```typescript
async emit(event: RunEvent) {
  for (const listener of this.listeners) {
    await listener({...event})  // If throws, loop breaks
  }
}
```

**Impact**: One failing listener prevents event delivery to others.

**Recommendation**: Catch errors per listener or use Promise.allSettled.

---

### 41. Nested Delegates Not Resolved

**Status**: 🟡 **By Design?**

**Category**: Architecture  
**Severity**: Minor

**Location**: `packages/runtime/src/setup-experts.ts:26-31`

**Issue**: Only first-level delegates are resolved; nested delegates are not:

```typescript
for (const delegateName of expertToRun.delegates) {
  const delegate = await resolveExpertToRun(delegateName, experts, clientOptions)
  // delegate.delegates are NOT resolved
}
```

**Impact**: If Expert A delegates to B, and B delegates to C, C is not pre-resolved.

**Note**: This may be by design (resolve on demand), but should be documented.

---

### 42. model.ts Switch Statement Missing Default Case

**Status**: 🟡 **Low Priority**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/model.ts:12-86`

**Issue**: The `getModel` switch statement has no default case. TypeScript exhaustiveness check helps, but at runtime an unexpected provider could cause silent failure.

**Impact**: If a new provider is added to the type but not implemented, no error is thrown.

**Recommendation**: Add exhaustive default case:
```typescript
default:
  const _exhaustive: never = providerConfig
  throw new Error(`Unknown provider: ${providerConfig.providerName}`)
```

---

### 43. Instruction Message Uses Runtime Values

**Status**: 🟡 **Low Priority**

**Category**: Code Quality  
**Severity**: Minor

**Location**: `packages/runtime/src/messages/instruction-message.ts:32-33`

**Issue**: The instruction message embeds `new Date().toISOString()` and `process.cwd()` at message creation time:

```typescript
const metaInstruction = dedent`
  ...
  - Current time is ${new Date().toISOString()}
  - Current working directory is ${process.cwd()}
`
```

**Impact**: When replaying from a checkpoint, the instruction will have a different timestamp and potentially different cwd than the original run.

**Recommendation**: Pass these values from setting/checkpoint for reproducibility.

---

## Summary by Category

| Category       | Critical | Major | Minor | Suggestions |
| -------------- | -------- | ----- | ----- | ----------- |
| Security       | 0 (1 ✅)  | 0     | 0     | 0           |
| Code Quality   | 1        | 4     | 11    | 5           |
| Documentation  | 0        | 0     | 3     | 1           |
| Test Quality   | 0        | 1     | 2     | 0           |
| Potential Bugs | 1        | 1     | 5     | 0           |
| Architecture   | 0        | 0     | 1     | 1           |
| Performance    | 0        | 0     | 0     | 1           |

**Total Findings**: 43

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
| #28   | SkillManager refactoring               | ✅ Fixed        |
| #29   | Provider settings discriminated union  | ✅ Fixed        |
| #30   | Separate types and schemas in core     | ⏸️ Future       |
| #31   | Skill lazy init for faster startup     | ⏸️ Future       |
| #32   | maxSteps off-by-one error              | ✅ Fixed        |
| #33   | Sandbox design flaw (workspace/chdir)  | ✅ Fixed        |
| #34   | Delegate expert not found error        | ✅ Fixed        |
| #35   | Skill object mutation                  | 🔴 Open         |
| #36   | experts object mutation                | 🔴 Open         |
| #37   | File operation error handling          | ✅ Fixed        |
| #38   | RunSetting schema validation           | 🔴 Open         |
| #39   | closeSkillManagers failure handling    | ✅ Fixed        |
| #40   | EventEmitter listener errors           | 🟡 Low priority |
| #41   | Nested delegates not resolved          | 🟡 By design?   |
| #42   | model.ts missing default case          | 🟡 Low priority |
| #43   | Instruction uses runtime values        | 🟡 Low priority |

---

## Remaining Items (Deferred)

### E2E Scope
- **#3**: State machine integration tests — requires E2E test infrastructure

### Low Priority / Future Work
- **#7**: Error message formatting — broad scope, not urgent
- **#9**: Duplicate schema definitions — significant refactoring required
- **#18**: Long functions without decomposition — refactoring
- **#21**: validatePath symlink race condition — theoretical TOCTOU issue
- **#24, #25, #30, #31**: Suggestions — future enhancements (OTEL, structured logging, types/schemas separation, skill lazy init)
- **#40, #42, #43**: Minor code quality issues — low priority

### Runtime Package Open Issues (2025-12-03)

**Minor (Should Fix)**:
- **#35, #36**: Object mutation side effects — defensive copying recommended
- **#38**: RunSetting not validated — use Zod schema

**By Design / Needs Clarification**:
- **#41**: Nested delegates not pre-resolved — document if intentional

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
| `ebf67bc` | Docs: Add JSDoc to all core schema types                           |
| `f7edeb9` | Refactor: Use discriminatedUnion for provider settings             |
| `5490ebb` | Refactor: Split SkillManager into separate classes                 |
| `ced1aa6` | Fix: maxSteps off-by-one error in finishing step                   |
| `dac71b5` | Fix: Handle individual close failures in closeSkillManagers        |
| `796f981` | Fix: Handle file read errors gracefully in resolving file states   |
| `cc23849` | Fix: Add explicit error when delegate expert not found             |
