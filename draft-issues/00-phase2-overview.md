# Multi-Runtime Support: Phase 2 Implementation Issues

## Overview

This document summarizes the Phase 2 implementation plan for Multi-Runtime Support (Epic #86).

## Issue List

| #   | Issue                       | Package(s)                            | Type   |
| --- | --------------------------- | ------------------------------------- | ------ |
| 01  | Core schema `runtime` field | `@perstack/core`                      | Add    |
| 02  | CLI `--runtime` option      | `perstack`, `@perstack/core`          | Add    |
| 03  | RuntimeAdapter interface    | `@perstack/runtime`                   | Add    |
| 04  | Integrate adapters into CLI | `perstack`, `@perstack/runtime`       | Update |
| 05  | CursorAdapter               | `@perstack/runtime`                   | Add    |
| 06  | ClaudeCodeAdapter           | `@perstack/runtime`                   | Add    |
| 07  | GeminiAdapter               | `@perstack/runtime`                   | Add    |
| 08  | Event Normalization         | `@perstack/runtime`, `@perstack/core` | Add    |
| 09  | TUI Multi-Runtime           | `@perstack/tui`, `perstack`           | Update |
| 10  | Registry runtime field      | `@perstack/api-client`, `perstack`    | Add    |
| 11  | E2E Tests                   | `e2e/`                                | Add    |
| 12  | Documentation Update        | `docs/`, `packages/*/README.md`       | Docs   |

## Dependency Graph

```
#01 Core Schema
 │
 ├──► #02 CLI --runtime option
 │     │
 │     └──► #04 Integrate adapters
 │           │
 │           ├──► #05 CursorAdapter ───┐
 │           ├──► #06 ClaudeCodeAdapter │
 │           └──► #07 GeminiAdapter ───┤
 │                                      │
 │                                      ▼
 ├──► #03 RuntimeAdapter interface ──► #04
 │
 ├──► #08 Event Normalization ──► #05, #06, #07
 │
 └──► #10 Registry runtime field

#04 Integrate adapters
 │
 ├──► #09 TUI Multi-Runtime
 │
 └──► #11 E2E Tests

All issues ──► #12 Documentation Update
```

## Recommended Implementation Order

### Wave 1: Foundation
1. **#01** Core schema `runtime` field

### Wave 2: Infrastructure (can be parallelized after #01)
2. **#02** CLI `--runtime` option (depends on #01)
3. **#03** RuntimeAdapter interface (depends on #01)
4. **#08** Event Normalization (depends on #01)
5. **#10** Registry runtime field (depends on #01)

### Wave 3: Integration
6. **#04** Integrate adapters into CLI (depends on #02, #03)

### Wave 4: Adapters (can be parallelized)
7. **#05** CursorAdapter (depends on #04, #08)
8. **#06** ClaudeCodeAdapter (depends on #04, #08)
9. **#07** GeminiAdapter (depends on #04, #08)

### Wave 5: Polish
10. **#09** TUI Multi-Runtime (depends on #04, #08)
11. **#11** E2E Tests (depends on #04, adapters)

### Wave 6: Finalization
12. **#12** Documentation Update (depends on all)

## Schema Changes Summary

### @perstack/core

**New types:**
- `RuntimeName = "perstack" | "cursor" | "claude-code" | "gemini"`
- `runtimeNameSchema` (Zod schema)

**Modified types:**
- `Expert.runtime: RuntimeName[]` (new field, default: `["perstack"]`)
- `PerstackConfigExpert.runtime?: RuntimeName | RuntimeName[]` (new field)
- `CommandOptions.runtime?: RuntimeName` (new field)
- `Checkpoint.metadata?: { runtime?: RuntimeName; externalExecution?: boolean }` (new field)

### @perstack/runtime

**New exports:**
- `RuntimeAdapter` interface
- `PerstackAdapter`, `CursorAdapter`, `ClaudeCodeAdapter`, `GeminiAdapter` classes
- `getAdapter(runtime: RuntimeName): RuntimeAdapter`
- `isAdapterAvailable(runtime: RuntimeName): boolean`
- `parseExternalOutput()`, `createNormalizedCheckpoint()` utilities

### @perstack/api-client

**Modified types:**
- `ApiRegistryExpert.runtime: RuntimeName[]` (new field)

## Testing Strategy

### Automated (CI)
- Schema validation tests
- Adapter factory tests
- CLI option parsing tests
- Output parser tests
- Perstack runtime execution tests

### Manual (requires external CLIs)
- Cursor adapter execution
- Claude Code adapter execution
- Gemini adapter execution
- TUI external runtime display
- Checkpoint storage verification

See `e2e/MANUAL-MULTI-RUNTIME.md` for manual test procedures.

## Changeset Strategy

**For all issues:** Create changeset with type `minor` for ALL packages since this adds new functionality.

Example changeset:

```markdown
---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/api-client": minor
"@perstack/tui": minor
"@perstack/base": minor
"perstack": minor
---

Add multi-runtime support (Phase 2)

- Add `runtime` field to Expert schema
- Add `--runtime` CLI option
- Add RuntimeAdapter interface and implementations
- Support Cursor, Claude Code, and Gemini runtimes
```

## Branch Strategy

All work should be done on `epic/multi-runtime` branch (already exists with documentation).

Merge to `main` when Phase 2 is complete and all acceptance criteria in Epic #86 are met.

## Key Design Decision: Runtime as Compatibility Declaration

The `runtime` field declares **which runtimes an Expert is compatible with**, not parallel execution:

```toml
[experts.my-expert]
runtime = ["cursor", "claude-code"]  # Compatible with both, runs on ONE at a time
```

**Execution is always single-runtime:**
- `perstack run my-expert "query" --runtime cursor` → runs on Cursor only
- If no `--runtime` specified, uses first compatible runtime from Expert's list

**Delegation behavior by runtime:**

| Caller Runtime | Delegate Behavior                                         |
| -------------- | --------------------------------------------------------- |
| `perstack`     | Full delegation via tool call (existing behavior)         |
| `cursor`       | Instruction-based only (delegate info embedded in prompt) |
| `claude-code`  | Instruction-based only (delegate info embedded in prompt) |
| `gemini`       | Instruction-based only (delegate info embedded in prompt) |

> **Technical Constraint:** External runtimes (Cursor, Claude Code, Gemini) do not expose skill/tool registration via their CLIs. Perstack cannot inject the `delegate` tool into these runtimes. Therefore, delegate information is embedded as instruction text only.

## Acceptance Criteria (from Epic #86)

- [ ] `perstack run my-expert "query" --runtime cursor` works
- [ ] `perstack run my-expert "query" --runtime claude-code` works
- [ ] `perstack run my-expert "query" --runtime gemini` works
- [ ] `perstack start my-expert --runtime <runtime>` works
- [ ] `runtime = ["cursor", "claude-code"]` declares compatibility (single execution)
- [ ] CLI validates `--runtime` against Expert's compatible runtimes
- [ ] Delegation to Expert respects runtime specification
- [ ] Checkpoints are stored in `perstack/jobs/` for all runtimes
- [ ] Prerequisites check shows helpful error messages
- [ ] Registry supports `runtime` field
