# Phase 1 Design Review Feedback

**PR**: #88 - Phase 1 Design: Multi-Runtime Support
**Epic**: #86 - Multi-Runtime Support
**Reviewer**: Claude
**Date**: 2025-12-09

---

## Summary

Overall, the design is comprehensive and well-structured. The RuntimeAdapter abstraction is sound, and the phased implementation approach is appropriate. However, there are several critical issues, inconsistencies, and missing considerations that should be addressed before implementation.

---

## Critical Issues

### 1. Parallel Multi-Runtime Execution Lacks Result Aggregation Strategy

**Location**: `04-integrate-adapters-cli.md` (lines 144-168)

**Issue**: `dispatchToMultipleRuntimes()` is mentioned for running an Expert on multiple runtimes in parallel when `runtime = ["cursor", "claude-code"]`, but:

- The function returns `DispatchResult[]` (array of checkpoints)
- How to present multiple results to the user is undefined
- The single `Checkpoint` return type of the existing `run()` function is incompatible with multiple results
- What happens if one runtime succeeds and another fails is not specified
- TUI cannot display multiple concurrent execution results

**Recommendation**:
1. Define a `MultiRuntimeResult` type that aggregates results
2. Specify behavior for partial failures (fail-fast vs. wait-all)
3. Consider if parallel execution should be deferred to a future phase
4. Update TUI design (#09) to handle multiple concurrent results

---

### 3. Delegation Across Runtimes Has Undefined Behavior

**Location**: Not addressed in any issue

**Issue**: When Expert A runs on Cursor and delegates to Expert B (which has `runtime: ["perstack"]`):

- Should Expert B run on Perstack (respecting its definition)?
- Or should it run on Cursor (inheriting from parent)?
- The current design only appends delegate context as text, not actual delegation

**Current behavior in design**: External runtimes receive delegate names as text context only - they cannot actually invoke other Experts.

**Recommendation**:
1. Add explicit documentation that delegation is informational only for external runtimes
2. Or design a callback mechanism where external runtimes can request delegation back to Perstack
3. Clarify in multi-runtime.mdx that delegation graph traversal requires Perstack runtime

---

### 4. RuntimeName Type Placement Creates Confusion

**Location**: `01-core-schema-runtime-field.md`

**Issue**: The design suggests adding `RuntimeName` to `packages/core/src/schemas/runtime.ts`, but this file already contains `RunEvent`, `RuntimeEvent`, `RunSetting`, and related types. Adding `RuntimeName` (the execution environment type) alongside `RuntimeEvent` (infrastructure events) creates semantic confusion.

The names are similar but concepts are different:
- `RuntimeName`: Which execution environment ("cursor", "perstack")
- `RuntimeEvent`: Infrastructure-level events during execution

**Recommendation**:
Either:
1. Create a new file `packages/core/src/schemas/runtime-name.ts` for better separation
2. Or add a clear section header comment in `runtime.ts` to distinguish the concepts
3. Consider renaming to `ExecutionRuntime` or `RuntimeTarget` to avoid confusion

---

### 5. External Runtime Events Are Not Streamed in Real-Time

**Location**: `08-event-normalization.md`, `09-tui-multi-runtime.md`

**Issue**: The Perstack runtime emits events step-by-step during execution. External runtimes:

- Execute as a subprocess that buffers output
- Only return output after completion
- Cannot emit intermediate events (startGeneration, callTools, etc.)

This means:
- TUI will show no progress during external runtime execution
- Event timeline will be incomplete
- Users may think the CLI is frozen

**Recommendation**:
1. Add a "waiting for external runtime" spinner/indicator in TUI
2. Document this limitation clearly
3. Consider periodic output polling if external CLIs support streaming
4. Add `externalRuntimeStarted` and `externalRuntimeCompleted` wrapper events

---

## Design Inconsistencies

### 6. Dependency Graph vs. Wave Description Mismatch

**Location**: `00-phase2-overview.md`

**Issue**:
- Dependency graph shows: `#08 Event Normalization ──► #05, #06, #07`
- Wave 1 says: "#08 Event Normalization (depends on #01)" and can be parallelized with #01
- But #08's "Blocked By" section says it depends on #01

If #08 depends on #01, it cannot be in the same wave. The Wave description suggests parallelization that isn't supported by the dependency graph.

**Recommendation**:
Move #08 to Wave 2 or clarify that it can start in Wave 1 after #01's RuntimeName type is defined.

---

### 7. Checkpoint Metadata Schema Update Missing from Issue #08

**Location**: `08-event-normalization.md` (lines 216-250)

**Issue**: The design adds `metadata` field to `Checkpoint` interface but:

- `checkpointSchema` (Zod) update is shown but not added to the "Affected Files" table
- Backward compatibility with existing checkpoints is not addressed
- Migration strategy for existing job histories is undefined

**Recommendation**:
1. Add `packages/core/src/schemas/checkpoint.ts` to Affected Files in #08
2. Ensure `.optional()` on metadata field for backward compatibility
3. Add test case for parsing old checkpoints without metadata

---

### 8. Missing Export Updates in Several Issues

**Location**: Multiple issues

**Issue**: Several issues mention new types but don't explicitly update index.ts exports:

- #01: `RuntimeName` and `runtimeNameSchema` exports mentioned but file path is `index.ts` (correct)
- #03: Exports mentioned but `packages/runtime/src/index.ts` update is in the code but not in Affected Files table
- #08: `ParsedOutput`, `CreateCheckpointParams` types added but export verification incomplete

**Recommendation**:
Review each issue and ensure:
1. All new types are listed in exports
2. Affected Files table includes all index.ts updates
3. Public API surface is clearly documented

---

## Missing Considerations

### 9. Skills Are Ignored for External Runtimes

**Location**: Not explicitly addressed (partially in `multi-runtime.mdx`)

**Issue**: The `convertExpert()` method in each adapter only extracts `instruction` and `delegates`. However:

- Experts define `skills` with MCP tools
- External runtimes have their own MCP configurations
- Perstack's default `@perstack/base` skill (attemptCompletion, executeShellCommand) won't exist

The documentation acknowledges this limitation but the design doesn't provide any mitigation:
- No warning when an Expert with custom skills runs on external runtime
- No skill compatibility check
- No guidance on which skills are available on each runtime

**Recommendation**:
1. Add a warning log when Expert has skills other than standard tools
2. Document expected tool availability per runtime
3. Consider adding `RuntimeExpertConfig.warnings?: string[]` to surface compatibility issues

---

### 10. Working Directory Not Specified for External Runtimes

**Location**: All adapter issues

**Issue**: External CLI commands are spawned without specifying `cwd` in spawn options:

```typescript
const proc = spawn("cursor-agent", [...], {
  env: { ...process.env },
  stdio: ["pipe", "pipe", "pipe"],
})
```

This relies on the current working directory being correct, but:
- Users may invoke `perstack` from different directories
- External runtimes may need to operate on specific project roots

**Recommendation**:
Add explicit `cwd: process.cwd()` or allow `cwd` to be configured via `RunSetting`.

---

### 11. Error Recovery Strategy Is Incomplete

**Location**: All adapter issues

**Issue**: When external runtime execution fails:

- Timeout handling kills the process but doesn't save partial state
- Exit code errors don't distinguish between CLI errors and execution errors
- Retry logic (from `maxRetries` setting) is not applied to external runtimes
- No checkpoint is created on failure

**Recommendation**:
1. Define `AdapterRunResult` to include error state: `| { ok: false; error: Error; partialOutput?: string }`
2. Apply retry logic consistently across adapters
3. Store error checkpoints with status `"stoppedByError"`
4. Add `PrerequisiteError.recoverable: boolean` for transient vs. permanent failures

---

### 12. Usage Tracking Is Lost for External Runtimes

**Location**: `08-event-normalization.md`

**Issue**: `createNormalizedCheckpoint()` uses `createEmptyUsage()`:

```typescript
usage: createEmptyUsage(),
```

This means:
- Token usage is not tracked for external runtimes
- Cost calculations will be incorrect
- Usage statistics in job history will show 0

**Recommendation**:
1. Document this limitation explicitly
2. Add `Usage | null` option to indicate "unknown" vs "zero"
3. Investigate if external CLIs output usage information that can be parsed

---

### 13. No Global Runtime Default Configuration

**Location**: `02-cli-runtime-option.md`

**Issue**: Users can only specify runtime via:
1. Expert definition: `runtime = ["cursor"]`
2. CLI flag: `--runtime cursor`

There's no way to set a global default in `perstack.toml`:
```toml
# This is not supported
defaultRuntime = "cursor"
```

**Recommendation**:
Add `PerstackConfig.defaultRuntime?: RuntimeName` for user convenience.

---

### 14. Test Mocking Strategy Is Undefined

**Location**: `11-e2e-tests-multi-runtime.md`

**Issue**: The testing strategy relies on:
1. Skip-if-unavailable tests (runtime not installed)
2. Manual tests (require external CLIs)

But there's no mock-based unit testing strategy for:
- Simulating external runtime behavior
- Testing error conditions
- CI pipeline integration

**Recommendation**:
1. Add mock adapter implementations for testing
2. Define test fixtures for external runtime output formats
3. Add integration test that uses mock adapters

---

### 15. Registry API Backward Compatibility

**Location**: `10-registry-runtime-field.md`

**Issue**: Adding `runtime` field to `ApiRegistryExpert`:
- Existing registry entries won't have this field
- Default value handling in schema is correct (defaults to `["perstack"]`)
- But API server-side compatibility is not addressed

**Recommendation**:
Coordinate with backend team to ensure:
1. Registry API accepts the new field
2. Existing entries return default value
3. API version negotiation if needed

---

## Minor Issues

### 16. Duplicate Code Across Adapters

**Location**: `05-cursor-adapter.md`, `06-claude-code-adapter.md`, `07-gemini-adapter.md`

**Issue**: Each adapter has identical:
- `execCommand()` method implementation
- Timeout handling logic
- Error handling patterns

**Recommendation**:
Extract to a base class or utility:
```typescript
// packages/runtime/src/adapters/base-external-adapter.ts
export abstract class BaseExternalAdapter implements RuntimeAdapter {
  protected async execCommand(args: string[]): Promise<ExecResult> { ... }
  protected async executeWithTimeout(proc: ChildProcess, timeout: number): Promise<ExecResult> { ... }
}
```

---

### 17. Output Parser "Future Version" Comments

**Location**: `08-event-normalization.md` (lines 60-73, 109-117)

**Issue**: Parser implementations contain comments like:
```typescript
// Cursor may output JSON events in future versions
// May have structured sections in future
```

This suggests incomplete implementation that will need revisiting.

**Recommendation**:
1. Add TODO comments with issue references for follow-up
2. Or remove speculative code and implement when specs are known

---

## Questions for Clarification

1. **Parallel Execution Use Case**: Is parallel multi-runtime execution a core requirement for Phase 2, or can it be deferred to a future phase?

2. **Delegation Semantics**: Should external runtimes be able to trigger actual Expert delegation, or is informational context sufficient?

3. **Registry API Timeline**: Is the backend team aware of the `runtime` field requirement? What's the coordination plan?

---

## Recommended Changes Summary

| Priority | Issue                       | Action                                                 |
| -------- | --------------------------- | ------------------------------------------------------ |
| Critical | #1 Parallel execution       | Define aggregation strategy or defer feature           |
| Critical | #2 Cross-runtime delegation | Document limitation or design callback mechanism       |
| High     | #3 Type naming              | Create separate file or rename for clarity             |
| High     | #4 Real-time events         | Add waiting indicator and document limitation          |
| Medium   | #5 Wave ordering            | Fix dependency graph consistency                       |
| Medium   | #6 Checkpoint migration     | Add backward compatibility handling                    |
| Medium   | #8 Skills warning           | Add runtime compatibility warnings                     |
| Medium   | #10 Error recovery          | Define comprehensive error handling                    |
| Low      | #15 Code duplication        | Extract base class (can be done during implementation) |

---

## Conclusion

The Phase 1 design provides a solid foundation for multi-runtime support. The CLI interfaces documented in Epic #86's references are accurate. The main concerns are:

1. **Parallel execution complexity**: Consider deferring to simplify initial implementation
2. **Limitation documentation**: Be explicit about what doesn't work with external runtimes (delegation, skills, real-time events)
3. **Consistency fixes**: Minor fixes to dependency graphs and affected files tables

With these issues addressed, the design is ready for Phase 2 implementation.

---

## Responses to Feedback

**Date**: 2025-12-09
**Responder**: Design author

### Critical Issues

#### #1 Parallel Multi-Runtime Execution

**Resolution**: ✅ Design clarified

The `runtime` field is a **compatibility declaration**, not parallel execution. This is analogous to `engines` in `package.json`:

```toml
runtime = ["cursor", "claude-code"]  # Compatible with both, runs on ONE at a time
```

- Execution is always single-runtime
- User selects runtime via `--runtime` CLI option
- If not specified, first compatible runtime from Expert's list is used
- `dispatchToMultipleRuntimes()` removed from design

#### #3 Delegation Across Runtimes

**Resolution**: ✅ Technical constraint documented

External runtimes (Cursor, Claude Code, Gemini) do not expose skill/tool registration via their CLIs. Perstack cannot inject the `delegate` tool into these runtimes.

| Caller Runtime | Delegate Behavior                                         |
| -------------- | --------------------------------------------------------- |
| `perstack`     | Full delegation via tool call (existing behavior)         |
| External       | Instruction-based only (delegate info embedded in prompt) |

**Note**: After further discussion, delegate info embedding was also removed since external runtimes cannot act on it anyway. Only `instruction + query` is passed to external CLI.

#### #4 RuntimeName Type Placement

**Resolution**: ✅ Separate file created

`RuntimeName` type will be in `packages/core/src/schemas/runtime-name.ts` (new file) to avoid confusion with `RuntimeEvent` in `runtime.ts`.

#### #5 External Runtime Events Not Real-Time

**Resolution**: ✅ Known limitation

This is acknowledged as a technical limitation. External runtimes execute as subprocesses and buffer output. TUI will show simplified status for external runtimes.

### Design Inconsistencies

#### #6 Dependency Graph vs. Wave Mismatch

**Resolution**: ✅ Fixed

#08 Event Normalization moved to Wave 2 (depends on #01).

#### #7 Checkpoint Metadata Missing from Affected Files

**Resolution**: ✅ Fixed

Added `packages/core/src/schemas/checkpoint.ts` to Affected Files with backward compatibility note (`.optional()` ensures old checkpoints parse correctly).

#### #8 Missing Export Updates

**Resolution**: ✅ Verified

All issues now explicitly list `index.ts` updates in Affected Files tables.

### Missing Considerations

#### #9 Skills Ignored for External Runtimes

**Resolution**: ✅ Already documented

`multi-runtime.mdx` already contains detailed warnings for each runtime:
- "skills → ⚠️ Not supported"
- Callouts explaining that custom skills won't work

No additional warnings needed in code.

#### #10 Working Directory Not Specified

**Resolution**: ✅ Fixed

Added `cwd: process.cwd()` to all `spawn()` calls in adapter designs.

#### #11 Error Recovery Incomplete

**Resolution**: ✅ Keep simple

Existing error handling design is sufficient. Delegate experts report errors to coordinators, and coordinators handle them per existing `error-handling.mdx` documentation. External runtimes follow "fail → error" pattern without special retry logic.

#### #12 Usage Tracking Lost

**Resolution**: ✅ Documented as limitation

Added "Known Limitations" section to #08 explaining that external runtimes do not expose token usage. Checkpoints will have `usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }`.

#### #13 No Global Runtime Default

**Resolution**: ✅ Not needed

Global default is always `"perstack"`. No configuration option needed.

#### #14 Test Mocking Strategy Undefined

**Resolution**: ✅ MockAdapter added

Added `MockAdapter` class to #11 E2E tests design. Enables testing without external CLI dependencies.

#### #15 Registry API Backward Compatibility

**Resolution**: ✅ Backend handles

Backend team will handle. Schema defaults to `["perstack"]` which is correct.

### Minor Issues

#### #16 Duplicate Code Across Adapters

**Resolution**: ✅ BaseExternalAdapter added

Added `BaseExternalAdapter` abstract class to #03 with shared `execCommand()` and `executeWithTimeout()` methods.

#### #17 Output Parser Future Comments

**Resolution**: ✅ Removed

Speculative comments removed. Parsers now return simple trimmed output.

### Questions for Clarification

1. **Parallel Execution**: Not a requirement. Single-runtime execution only.
2. **Delegation Semantics**: Informational context is NOT passed. Only instruction + query.
3. **Registry API**: Backend team handles. Default `["perstack"]` is correct.

---

## Summary of Changes Made

| Issue | Change                                                      |
| ----- | ----------------------------------------------------------- |
| #1    | Clarified runtime as compatibility declaration              |
| #3    | Documented technical constraint, removed delegate embedding |
| #4    | Changed to `runtime-name.ts` new file                       |
| #5    | Acknowledged as known limitation                            |
| #6    | Moved #08 to Wave 2                                         |
| #7    | Added checkpoint.ts to Affected Files                       |
| #8    | Verified exports in all issues                              |
| #9    | Existing docs sufficient                                    |
| #10   | Added `cwd: process.cwd()`                                  |
| #11   | Keep simple error handling                                  |
| #12   | Added Known Limitations section                             |
| #13   | Default is always perstack                                  |
| #14   | Added MockAdapter                                           |
| #15   | Backend handles                                             |
| #16   | Added BaseExternalAdapter                                   |
| #17   | Removed speculative comments                                |
