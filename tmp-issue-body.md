## Summary

Extract storage functionality from `@perstack/runtime` into a new `@perstack/storage` package.

## Motivation

Currently, `perstack` (CLI) depends on both `@perstack/runner` and `@perstack/runtime`:
- `@perstack/runner` - for runtime dispatch
- `@perstack/runtime` - for storage access (jobs, checkpoints, events)

This creates an awkward dependency where CLI needs runtime directly for storage, even though runner already depends on runtime.

## Proposed Structure

```
@perstack/storage (new)
  └── No workspace deps (only @perstack/core for types)

@perstack/runtime
  └── @perstack/core
  └── @perstack/api-client
  └── @perstack/storage (new dep)

perstack (CLI)
  └── @perstack/core
  └── @perstack/api-client
  └── @perstack/runner
  └── @perstack/tui
  └── @perstack/storage (replaces direct @perstack/runtime dep)
```

## Files to Move

From `packages/runtime/src/storage/`:
- `checkpoint.ts`
- `event.ts`
- `job.ts`
- `run-setting.ts`
- `index.ts`

## Changes Required

### New Package: `@perstack/storage`
- Create `packages/storage/`
- Move storage files from runtime
- Export all storage functions

### `@perstack/runtime`
- Add `@perstack/storage` as dependency
- Re-export storage functions (for backward compatibility if needed)
- Remove moved files

### `packages/perstack` (CLI)
- Replace `@perstack/runtime` with `@perstack/storage` for storage access
- Update imports in `run-manager.ts`

### `@perstack/runner`
- No changes needed (does not use storage directly)

## Benefits

- Cleaner dependency graph
- CLI no longer needs direct runtime dependency
- Storage can be versioned independently
- Easier to test storage in isolation

