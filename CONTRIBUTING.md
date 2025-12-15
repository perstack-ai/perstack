# Contributing to Perstack

Thank you for your interest in contributing to Perstack.

## For Humans

**We recommend agent-first development.** Use AI coding assistants (Cursor, GitHub Copilot, etc.) with `AGENTS.md` to handle the complexity of our versioning and type management system.

### Quick Reference

**Fix a bug:**
```bash
pnpm changeset
# Select: Only your package
# Type: patch
```

**Add a new feature (no schema change):**
```bash
pnpm changeset
# Select: @perstack/core + ALL packages (except docs)
# Type: minor (for all)
```

**Change core schemas:**
Read the [full versioning guide](#versioning-strategy) first. Core changes ripple through everything.

---

## For Agents

The rest of this document provides detailed guidelines for AI agents. Agents should read and follow these rules when making changes to this repository.

## Table of Contents

- [Core Philosophy](#core-philosophy)
- [Quick Start](#quick-start)
- [Type Management](#type-management)
- [Versioning Strategy](#versioning-strategy)
- [Development Workflow](#development-workflow)
- [Common Scenarios](#common-scenarios)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## AI Agent Workflows

For AI coding agents, detailed workflows are available in the `agents/` directory:

| Workflow | Document |
| --- | --- |
| Implementation | [agents/implementation.md](./agents/implementation.md) |
| Issue Writing | [agents/issue-writing.md](./agents/issue-writing.md) |
| QA | [agents/qa.md](./agents/qa.md) |
| PR Review | [agents/pr-review.md](./agents/pr-review.md) |
| Security Audit | [agents/audit.md](./agents/audit.md) |
| CLI Reference | [agents/cli-reference.md](./agents/cli-reference.md) |

## Core Philosophy

Perstack uses **centralized schema management** where `@perstack/core` serves as the single source of truth for all cross-package types. This design choice emerged from a simple principle:

> **When types cross boundaries, chaos follows unless there's a single authority.**

### Why This Matters

Traditional monorepos often let each package define its own types, leading to:
- Type drift between packages
- Impossible-to-track breaking changes
- Integration hell during version bumps

We chose a different path: the version number of `@perstack/core` is the contract. When core changes, the contract changes. Simple.

**User Experience Guarantee:**

This unified versioning strategy ensures users can trust the version number. When a user runs Perstack 1.2.x, they can confidently use any feature documented for version 1.2, knowing that:
- The runtime supports all 1.2.x schemas
- The `perstack.toml` directives for 1.2 are available
- The CLI commands match the documented 1.2 API

No guessing. No "this should work but doesn't." If the version matches, the feature works.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/perstack-ai/perstack.git
cd perstack
pnpm install
pnpm build

# Make changes and create changeset
git checkout -b feature/your-feature
# ... edit code ...
pnpm changeset
pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e  # Run E2E tests
git commit -m "feat: your changes"
```

## Type Management

### The Contract System

Think of `@perstack/core`'s version as a contract:

```
major.minor.patch
  │     │     │
  │     │     └─ Implementation quality (bugs, performance)
  │     └─────── Interface additions (backward compatible)
  └───────────── Interface changes (breaking)
```

**Rule:** All packages must share the same `major.minor` version. When any package needs a minor/major bump, all packages bump together. This ensures the entire system speaks the same language.

### Package Dependency Graph

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
    @perstack/docker      - Docker runtime with network isolation
    @perstack/cursor      - Cursor CLI adapter
    @perstack/claude-code - Claude Code CLI adapter
    @perstack/gemini      - Gemini CLI adapter
```

### Schema Modification Rules

| Change Type        | Version Bump | Example               | Affects                   |
| ------------------ | ------------ | --------------------- | ------------------------- |
| Add optional field | Minor        | `field?: string`      | Core + dependents (minor) |
| Add required field | Major        | `field: string`       | Core + dependents (major) |
| Remove any field   | Major        | Delete property       | Core + dependents (major) |
| Change field type  | Major        | `string` → `number`   | Core + dependents (major) |
| Rename field       | Major        | `oldName` → `newName` | Core + dependents (major) |
| Documentation only | Patch        | JSDoc updates         | Single package (patch)    |

## Versioning Strategy

### Decision Flow

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

### Version Sync Rules

**Unified Minor/Major:**
- All packages share the same `major.minor` version
- When any package needs minor bump → all packages bump to `x.(y+1).0`
- When any package needs major bump → all packages bump to `(x+1).0.0`

**Independent Patches:**
- Runtime can be `1.2.5` while api-client is `1.2.3` (same `major.minor`, different patches)

## Development Workflow

### 1. Branch and Edit

```bash
git checkout -b fix/memory-leak
# ... edit code, add tests ...
```

### 2. Create Changeset

The changeset wizard will guide you, but here's what to select:

**For Patches (bug fixes, performance):**
```bash
pnpm changeset
# Select: Only the affected package
# Type: patch
# Message: "Fixed memory leak in cleanup"
```

**For Minor (new features):**
```bash
pnpm changeset
# Select: @perstack/core + ALL packages (except docs)
# Type: minor (for all selected)
# Message: "Added streaming support to expert execution"
```

**For Major (breaking changes):**
```bash
pnpm changeset
# Select: @perstack/core + ALL packages (except docs)
# Type: major (for all selected)
# Message: "BREAKING: Removed deprecated temperature field"
```

### 3. Validate

```bash
pnpm typecheck  # Must pass
pnpm test       # Must pass
pnpm build      # Must succeed
pnpm test:e2e   # Run E2E tests
```

### 4. Commit and Push

```bash
git add .
git commit -m "fix: memory leak in skill manager cleanup"
git push origin fix/memory-leak
```

### 5. Create PR

Open a pull request. CI will validate:
- ✓ Lint & format check
- ✓ Type checking across all packages
- ✓ Unused dependencies check
- ✓ Version sync compliance
- ✓ Changeset validation (PR only)
- ✓ Schema diff detection (PR only)
- ✓ All tests passing
- ✓ Build succeeds
- ✓ Changeset presence (PR only)

## Common Scenarios

### Scenario 1: Adding a New Expert Feature

You want to add an optional `metadata` field to experts.

```typescript
// packages/core/src/schemas/expert.ts
export const expertSchema = z.object({
  name: z.string(),
  version: z.string(),
  metadata: z.record(z.unknown()).optional()  // ← New
})
```

**Changeset:**
```bash
pnpm changeset
# Select: ALL packages (@perstack/core, @perstack/runtime, @perstack/api-client, @perstack/base, @perstack/tui, perstack)
# Type: minor (for all)
```

**Result:** All packages bump from `x.y.z` → `x.(y+1).0`

### Scenario 2: Fixing a Runtime Bug

You fixed a memory leak in the runtime, no type changes.

```bash
pnpm changeset
# Select: @perstack/runtime only
# Type: patch
```

**Result:** Only runtime bumps `1.2.3` → `1.2.4`

### Scenario 3: Breaking Change

You need to remove a deprecated field from core schemas.

```typescript
// Before
export const runParamsSchema = z.object({
  temperature: z.number().optional(),  // ← Removing this
  providerConfig: z.object({
    temperature: z.number().optional()
  })
})

// After
export const runParamsSchema = z.object({
  providerConfig: z.object({
    temperature: z.number().optional()
  })
})
```

**Changeset:**
```markdown
---
"@perstack/core": major
"@perstack/runtime": major
"@perstack/api-client": major
"@perstack/base": major
"@perstack/tui": major
"@perstack/perstack": major
---

BREAKING: Removed deprecated `temperature` field from RunParams

Migration:
- Before: `{ temperature: 0.7 }`
- After: `{ providerConfig: { temperature: 0.7 } }`

All code using the old field must be updated.
```

**Result:** All packages bump to next major version

### Scenario 4: Documentation Update

You updated README and JSDoc comments.

```bash
pnpm changeset
# Select: @perstack/runtime (or whichever package)
# Type: patch
```

**Result:** Only the documented package bumps patch version

## Troubleshooting

### "Version sync check failed"

**Problem:** Core is `1.3.0` but runtime is still `1.2.5`

**Solution:** Your changeset must bump runtime to `1.3.x`:
```bash
# Delete old changeset
rm .changeset/your-changeset.md
# Create new one with correct packages
pnpm changeset
# Select: runtime (with minor bump)
```

### "Type error in dependent package"

**Problem:** Changed core types but forgot to update runtime

**Solution:** 
1. Fix the type errors in runtime
2. Include runtime in your changeset
3. Both core and runtime must have matching `major.minor`

### "Changeset validation failed"

**Problem:** Added required field to core schema but only bumped minor

**Solution:**
```bash
# Delete incorrect changeset
rm .changeset/your-changeset.md
# Create correct one
pnpm changeset
# Select: @perstack/core + all dependents
# Type: major (for all)
```

### "Why doesn't @perstack/base export its tool schemas?"

**Answer:** Tool input schemas are defined inline for MCP SDK registration. They don't cross package boundaries - they're only used within the MCP server implementation. This is an isolated exception that doesn't violate our centralized management principle.

### "Do I need to bump all packages for a minor change?"

**Yes, for minor/major bumps.** All packages must have the same `major.minor` version:
- Any minor bump → Yes, bump ALL packages (including @perstack/base)
- Any major bump → Yes, bump ALL packages
- Bug fix (patch) → No, bump affected package only

## Special Cases

### @perstack/base

This package defines tool input schemas inline rather than centralizing them in `@perstack/core` because:
- Tool schemas are only used for MCP SDK registration
- They don't cross package boundaries
- They're never exported to other packages

**Rule:** Keep tool schemas in `@perstack/base/src/tools/` defined inline and never export them.

**Version Sync:** Despite not depending on `@perstack/core`, `@perstack/base` participates in unified versioning for ecosystem consistency. When any package has a minor/major bump, all packages (including base) sync their `major.minor` versions.

### Breaking Changes Best Practices

1. **Deprecate First** (if possible)
   ```typescript
   /** @deprecated Use providerConfig.temperature instead */
   temperature?: number
   ```

2. **Provide Migration Guide**
   ```markdown
   ### Migration: v1.x → v2.0
   
   **Changed:** RunParams structure
   **Impact:** High - affects all expert executions
   **Action Required:** Update all `temperature` usages
   ```

3. **Major Version Coordination**
   - Update all packages in single PR
   - Test integration scenarios
   - Update documentation

## Security

### Reporting Vulnerabilities

See [SECURITY.md](./SECURITY.md#reporting-vulnerabilities) for how to report security issues.

**Do not** open public GitHub issues for security vulnerabilities.

### Security-Related Changes

When making changes that affect security:

1. **Review the security model** in [SECURITY.md](./SECURITY.md)
2. **Update Known Limitations** if new limitations are discovered
3. **Consider impact on all runtimes** — Docker adapter has different security than default runtime
4. **Add tests** for security-critical functionality

### After Security Audits

When a security audit is completed:

1. Update the Audit History section in [SECURITY.md](./SECURITY.md#audit-history)
2. Create issues for open findings using SEC-XXX format (see [agents/issue-writing.md](./agents/issue-writing.md))
3. Reference the audit report in issue descriptions

See [agents/audit.md](./agents/audit.md) for the full security audit methodology.

## CI/CD Pipeline

### CI Jobs

| Job               | Description                                                                    | When                                      |
| ----------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `quality`         | Lint, format, typecheck, knip, version sync, changeset validation, schema diff | Always                                    |
| `test`            | Unit tests with coverage                                                       | Always                                    |
| `build`           | Build all packages with turbo cache                                            | Always                                    |
| `changeset-check` | Verify changeset exists in PR                                                  | PR only (excludes Dependabot/release PRs) |
| `ci-success`      | Final status check for branch protection                                       | Always                                    |

### PR Checks
- ✓ Lint & format check
- ✓ Type checking across all packages
- ✓ Unused dependencies check (knip)
- ✓ Version sync compliance
- ✓ Changeset validation
- ✓ Schema diff detection
- ✓ All tests passing
- ✓ Build succeeds
- ✓ Changeset presence

### Release Process (Two-Stage)

Perstack uses a two-stage release workflow powered by [changesets/action](https://github.com/changesets/action):

**Stage 1: Version PR Creation**
1. Merge PR with changeset to `main`
2. Release workflow automatically creates/updates "Version Packages" PR
3. This PR contains:
   - Version bumps in `package.json` files
   - Updated `CHANGELOG.md` with PR links and author attribution

**Stage 2: Publish**
1. Review "Version Packages" PR
2. **Run E2E tests locally before merging:**
   ```bash
   pnpm build && pnpm test:e2e
   ```
3. Merge "Version Packages" PR
4. Release workflow automatically:
   - Publishes packages to npm
   - Creates git tags
   - Creates GitHub Releases

**No manual release commands needed.** Everything is automated after changesets are merged.

## Code Style

### Commit Messages

Follow conventional commits:

```
feat: add metadata support to experts
fix: resolve memory leak in cleanup
docs: update API documentation
refactor: simplify schema validation
test: add integration tests
chore: update dependencies
```

### TypeScript Style

```typescript
// ✓ Good
export interface ExpertConfig {
  name: string
  version: string
  metadata?: Record<string, unknown>
}

// ✗ Avoid
export interface ExpertConfig {
  name: any  // Too loose
  version: string
  metadata: object  // Use Record instead
}
```

### Zod Schema Style

```typescript
// ✓ Good: Descriptive field names, clear optional markers
export const expertSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([])
})

// ✗ Avoid: Ambiguous types, missing validation
export const expertSchema = z.object({
  name: z.string(),
  version: z.string(),
  data: z.any()  // Too vague
})
```

### Comments Policy

Code that requires comments to be understood is poorly written code.

- Do NOT write comments by default
- Comments are allowed ONLY when:
  - The logic is fundamentally complex (algorithmic, mathematical)
  - External constraints force unintuitive implementations
  - Explaining "why" something is done unusually
- Never write comments that explain "what" the code does

### Blank Lines Policy

Use blank lines to separate logical sections, not to fragment related code.

**DO use blank lines:**
- After import statements (one blank line)
- Between functions/methods (one blank line)
- Between major logical sections within a function

**DO NOT use blank lines:**
- Between closely related statements (consecutive variable declarations)
- Inside control flow blocks (`if`/`else`, `switch`/`case`, `try`/`catch`)
- Between a condition and its immediate consequence

### Prohibited Patterns

The following patterns are strictly prohibited:

**Semicolon-prefixed expressions:**
```typescript
// ✗ Bad
;(mockFn as ReturnType<typeof mock>).mockResolvedValue(value)

// ✓ Good
const mockFnTyped = mockFn as ReturnType<typeof mock>
mockFnTyped.mockResolvedValue(value)
```

**IIFE for type casting:**
```typescript
// ✗ Bad
spyOn(process, "exit").mockImplementation((() => {}) as unknown as (code: number) => never)

// ✓ Good
const mockExit: (code: number) => never = () => undefined as never
spyOn(process, "exit").mockImplementation(mockExit)
```

**Suppression comments:**
```typescript
// ✗ Bad
// @ts-ignore
// @ts-expect-error
// biome-ignore
```

## Writing Good Issues

For detailed issue writing guidelines, see [agents/issue-writing.md](./agents/issue-writing.md).

Key points:
- Each issue = one actionable unit of work (one PR)
- Titles describe **what to solve**, not implementation details
- Security issues use SEC-XXX format

## Getting Help

- **Questions:** [Open a discussion](https://github.com/perstack-ai/perstack/discussions)
- **Bugs:** [Open an issue](https://github.com/perstack-ai/perstack/issues) with reproduction
- **Features:** [Open an issue](https://github.com/perstack-ai/perstack/issues) with use case

## Code Review Checklist

Before requesting review, ensure:

- [ ] Changeset created with appropriate version bump
- [ ] All tests pass (`pnpm test`)
- [ ] Types check across all packages (`pnpm typecheck`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Documentation updated (README, JSDoc, CHANGELOG via changeset)
- [ ] Migration guide included (for breaking changes)
- [ ] No unintended version sync issues
- [ ] Security impact assessed (if applicable)
- [ ] SECURITY.md updated (if new limitations discovered)

---

Thank you for contributing to Perstack.
Your attention to version management helps keep the entire ecosystem stable and predictable.
