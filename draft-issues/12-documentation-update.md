---
title: "Docs: Final documentation review for multi-runtime support"
labels: ["multi-runtime", "docs"]
---

## Overview

Review and finalize all documentation related to multi-runtime support. Most documentation was written ahead of implementation; this issue ensures everything is accurate and complete.

## Background

Documentation locations:
- `docs/content/using-experts/multi-runtime.mdx` — Main feature documentation
- `docs/content/references/cli.mdx` — CLI reference
- `docs/content/references/perstack-toml.mdx` — Configuration reference
- `docs/content/references/registry-api.mdx` — Registry API reference
- `packages/*/README.md` — Package-specific documentation

## Implementation

### 1. Review multi-runtime.mdx

**File:** `docs/content/using-experts/multi-runtime.mdx`

Verify:
- [ ] All CLI commands work as documented
- [ ] Example TOML configurations are valid
- [ ] Execution flow diagram is accurate
- [ ] Limitations section is complete
- [ ] Runtime-specific setup instructions are correct

Update if needed:
- CLI command examples
- Error messages
- Prerequisites
- Limitations discovered during implementation

### 2. Review cli.mdx

**File:** `docs/content/references/cli.mdx`

Verify:
- [ ] `--runtime` option documented correctly
- [ ] Available runtimes list is accurate
- [ ] Examples are valid

### 3. Update perstack-toml.mdx

**File:** `docs/content/references/perstack-toml.mdx`

Add `runtime` field to Expert definition table:

```markdown
| Field     | Type               | Required | Description                               |
| --------- | ------------------ | -------- | ----------------------------------------- |
| `runtime` | string \| string[] | No       | Target runtimes (default: `["perstack"]`) |
```

Add example:

```toml
[experts."my-expert"]
version = "1.0.0"
runtime = ["perstack", "cursor"]
description = "Multi-runtime capable expert"
instruction = "..."
```

### 4. Update registry-api.mdx

**File:** `docs/content/references/registry-api.mdx`

Verify `runtime` field is documented in:
- Publish Expert request body
- Get Expert response
- Expert schema

### 5. Update Runtime Package README

**File:** `packages/runtime/README.md`

Add section on RuntimeAdapter:

```markdown
## Multi-Runtime Support

The runtime package supports execution via external runtimes through the adapter system.

### Available Adapters

| Adapter             | Runtime       | Description                |
| ------------------- | ------------- | -------------------------- |
| `PerstackAdapter`   | `perstack`    | Built-in runtime (default) |
| `CursorAdapter`     | `cursor`      | Cursor CLI headless mode   |
| `ClaudeCodeAdapter` | `claude-code` | Claude Code CLI            |
| `GeminiAdapter`     | `gemini`      | Gemini CLI                 |

### Using Adapters

```typescript
import { getAdapter, isAdapterAvailable } from "@perstack/runtime"

if (isAdapterAvailable("cursor")) {
  const adapter = getAdapter("cursor")
  const prereqs = await adapter.checkPrerequisites()
  if (prereqs.ok) {
    const result = await adapter.run({ setting, checkpoint })
  }
}
```

See [Multi-Runtime Support](../../docs/content/using-experts/multi-runtime.mdx) for full documentation.
```

### 6. Update Core Package README

**File:** `packages/core/README.md`

Add `RuntimeName` type to exports section:

```markdown
### Runtime Types

- `RuntimeName` — Union type of supported runtime names
- `runtimeNameSchema` — Zod schema for runtime name validation
```

### 7. Update Root README

**File:** `README.md`

Verify multi-runtime is mentioned in features if it's a key capability.

## Affected Files

| File                                           | Change                               |
| ---------------------------------------------- | ------------------------------------ |
| `docs/content/using-experts/multi-runtime.mdx` | Review and update                    |
| `docs/content/references/cli.mdx`              | Verify --runtime documentation       |
| `docs/content/references/perstack-toml.mdx`    | Add runtime field                    |
| `docs/content/references/registry-api.mdx`     | Add runtime field                    |
| `packages/runtime/README.md`                   | Add adapter documentation            |
| `packages/core/README.md`                      | Add RuntimeName exports              |
| `README.md`                                    | Mention multi-runtime if appropriate |

## Documentation Checklist

### Accuracy
- [ ] All code examples compile/run
- [ ] All CLI commands work as shown
- [ ] All TOML examples are valid
- [ ] Error messages match implementation

### Completeness
- [ ] All new types documented
- [ ] All new CLI options documented
- [ ] All limitations documented
- [ ] All prerequisites documented

### Consistency
- [ ] Terminology consistent across docs
- [ ] Format consistent with existing docs
- [ ] Links work and point to correct locations

## Acceptance Criteria

- [ ] All documentation files reviewed
- [ ] All code examples verified
- [ ] `runtime` field documented in perstack-toml.mdx
- [ ] RuntimeAdapter documented in runtime README
- [ ] RuntimeName documented in core README
- [ ] No broken links
- [ ] Documentation builds without errors (`pnpm build` in docs/)

## Dependencies

All previous issues in the multi-runtime epic.

## Blocked By

- #01 Core schema `runtime` field
- #02 CLI `--runtime` option
- #03 RuntimeAdapter interface
- #04 Integrate adapters into CLI
- #05 CursorAdapter
- #06 ClaudeCodeAdapter
- #07 GeminiAdapter
- #08 Event Normalization
- #09 TUI Multi-Runtime
- #10 Registry runtime field
- #11 E2E Tests

## Blocks

None (final issue)

## Notes

This issue should be completed last, after all implementation is done and tested. The documentation review ensures everything is accurate based on actual implementation behavior.
