# API Client Workflow

This document defines the workflow for implementing or updating the `@perstack/api-client` package based on API changes.

> **Re-read this document before starting any API client work to avoid drift.**

## Prerequisites

- Read `.agent/rules/coding-style.md` for coding standards
- Read `.agent/rules/how-you-work.md` for general workflow

## Phase 1: Generate and Diff

1. **Generate API Reference from OpenAPI spec**

   ```bash
   npx tsx scripts/generate-api-docs.ts --output ./docs/api-reference
   ```

2. **Check for changes**

   ```bash
   git diff --name-only docs/api-reference/
   ```

3. **If no changes** — API is in sync, no work needed

4. **If changes exist** — Proceed to Phase 2

## Phase 2: Analyze Changes

1. **View the diff for changed files only**

   ```bash
   git diff docs/api-reference/
   ```

2. **Read only the changed .md files**

   Do NOT read all API reference files. Only read files that appear in the diff.

3. **Identify the affected api-client modules**

   | Changed API Reference             | Affected api-client Module |
   | --------------------------------- | -------------------------- |
   | `registry-v1/experts.md`          | `v1/registry/experts.ts`   |
   | `registry-v1/experts-versions.md` | `v1/registry/experts.ts`   |
   | `studio-v1/experts.md`            | `v1/studio/experts.ts`     |
   | `studio-v1/expert-jobs.md`        | `v1/studio/expert-jobs.ts` |
   | `studio-v1/expert-jobs-*.md`      | `v1/studio/expert-jobs.ts` |
   | `studio-v1/workspace.md`          | `v1/studio/workspace.ts`   |

4. **ultrathink** — Plan the changes based on the diff

## Phase 3: Implementation

### Read existing code (only affected modules)

```
packages/api-client/v1/
├── client.ts          # ApiV1Client class
├── schemas/           # Zod schemas
└── [affected module]  # Only read what you need to change
```

### Reuse @perstack/core schemas

**Critical**: Import and extend from `@perstack/core` where possible.

```typescript
// Good: Import from core
import { expertSchema, expertKeyRegex } from "@perstack/core"

// Bad: Duplicate definition
const expertSchema = z.object({ ... })
```

### Implementation Pattern

> **TBD**: Implementation patterns will be defined after api-client rewrite.

## Phase 4: Testing

> **TBD**: Testing patterns will be defined after api-client rewrite.

## Phase 5: Validation

```bash
pnpm typecheck
pnpm format-and-lint
pnpm test -- packages/api-client
```

## Phase 6: Commit

Commit both the generated docs and the api-client changes:

```bash
git add docs/api-reference/ packages/api-client/
git commit -m "feat(api-client): sync with API changes"
```

## Mapping: API Reference → Zod

| API Reference Field      | Zod Implementation                          |
| ------------------------ | ------------------------------------------- |
| `type: string`           | `z.string()`                                |
| `type: string (pattern)` | `z.string().regex(pattern)`                 |
| `type: number`           | `z.number()`                                |
| `type: enum`             | `z.enum([...])` or `z.union([z.literal()])` |
| `type: object`           | `z.object({ ... })`                         |
| `type: array`            | `z.array(schema)`                           |
| `format: date-time`      | `z.iso.datetime().transform(...)`           |
| `minLength/maxLength`    | `.min()/.max()` with error messages         |
| `required: Yes`          | Field in `z.object()` (not `.optional()`)   |
| `required: No`           | `.optional()`                               |

## Quick Reference

```
1. GENERATE & DIFF
   npx tsx scripts/generate-api-docs.ts --output ./docs/api-reference
   git diff --name-only docs/api-reference/

2. READ ONLY CHANGED FILES
   git diff docs/api-reference/
   (Do NOT read unchanged files)

3. IMPLEMENT (TBD)

4. TEST & VALIDATE (TBD)

5. COMMIT
   git add docs/api-reference/ packages/api-client/
```
