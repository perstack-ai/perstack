# Project Versioning

## Core Philosophy

Perstack uses **centralized schema management** where `@perstack/core` serves as the single source of truth for all cross-package types.

> **When types cross boundaries, chaos follows unless there's a single authority.**

### Why This Matters

Traditional monorepos often let each package define its own types, leading to:

- Type drift between packages
- Impossible-to-track breaking changes
- Integration hell during version bumps

We chose a different path: the version number of `@perstack/core` is the contract. When core changes, the contract changes. Simple.

### User Experience Guarantee

This unified versioning strategy ensures users can trust the version number. When a user runs Perstack 1.2.x, they can confidently use any feature documented for version 1.2, knowing that:

- The runtime supports all 1.2.x schemas
- The `perstack.toml` directives for 1.2 are available
- The CLI commands match the documented 1.2 API

No guessing. No "this should work but doesn't." If the version matches, the feature works.

## The Contract System

Think of `@perstack/core`'s version as a contract:

```
major.minor.patch
  │     │     │
  │     │     └─ Implementation quality (bugs, performance)
  │     └─────── Interface additions (backward compatible)
  └───────────── Interface changes (breaking)
```

**Rule:** All packages must share the same `major.minor` version. When any package needs a minor/major bump, all packages bump together.

## Package Dependency Graph

```
@perstack/core (schemas, types)
    │
    ├─→ @perstack/storage (persistence)
    ├─→ @perstack/api-client (API layer)
    ├─→ @perstack/tui (terminal UI)
    │
    └─→ @perstack/runtime (execution)
            │
            └─→ @perstack/storage

@perstack/base (tool schemas defined inline, not exported)

Adapters (experimental):
    @perstack/docker
    @perstack/cursor
    @perstack/claude-code
    @perstack/gemini
```

## Decision Flow

```
START: What did you change?
│
├─ Changed core schemas?
│  │
│  ├─ Added optional field? → MINOR bump (core + all dependents)
│  ├─ Added required field? → MAJOR bump (core + all dependents)
│  └─ Removed/changed field? → MAJOR bump (core + all dependents)
│
├─ Added new feature (no schema change)?
│  └─ → MINOR bump (core + all dependents)
│
└─ Fixed bug/improved performance?
   └─ → PATCH bump (affected package only)
```

## Schema Modification Rules

| Change Type        | Version Bump | Affects                   |
| ------------------ | ------------ | ------------------------- |
| Add optional field | Minor        | Core + dependents (minor) |
| Add required field | Major        | Core + dependents (major) |
| Remove any field   | Major        | Core + dependents (major) |
| Change field type  | Major        | Core + dependents (major) |
| Rename field       | Major        | Core + dependents (major) |
| Documentation only | Patch        | Single package (patch)    |

## Version Sync Rules

**Unified Minor/Major:**

- All packages share the same `major.minor` version
- Minor bump → all packages bump to `x.(y+1).0`
- Major bump → all packages bump to `(x+1).0.0`

**Independent Patches:**

- Patches are per-package (e.g., runtime `1.2.5`, api-client `1.2.3`)

## Changeset Rules

| Change Type        | Changeset Required | Version Bump                  |
| ------------------ | ------------------ | ----------------------------- |
| Bug fix            | Yes                | patch (affected package only) |
| New feature        | Yes                | minor (all packages)          |
| Breaking change    | Yes                | major (all packages)          |
| Documentation only | Optional           | patch                         |

```bash
pnpm changeset
```

## Special Cases

### @perstack/base

This package defines tool input schemas inline rather than centralizing them in `@perstack/core` because:

- Tool schemas are only used for MCP SDK registration
- They don't cross package boundaries
- They're never exported to other packages

**Rule:** Keep tool schemas in `@perstack/base/src/tools/` defined inline and never export them.

**Version Sync:** Despite not depending on `@perstack/core`, `@perstack/base` participates in unified versioning for ecosystem consistency. When any package has a minor/major bump, all packages (including base) sync their `major.minor` versions.

## Breaking Changes Best Practices

### 1. Deprecate First (if possible)

```typescript
/** @deprecated Use providerConfig.temperature instead */
temperature?: number
```

### 2. Provide Migration Guide

```markdown
### Migration: v1.x → v2.0

**Changed:** RunParams structure
**Impact:** High - affects all expert executions
**Action Required:** Update all `temperature` usages
```

### 3. Major Version Coordination

- Update all packages in single PR
- Test integration scenarios
- Update documentation
