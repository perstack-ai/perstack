# AGENTS.md

## Project Overview

Perstack is a package manager and runtime for agent-first development. Think of it as npm/npx for AI agents.

- **Experts**: Modular micro-agents defined in TOML
- **Runtime**: Executes Experts with isolation, observability, and sandbox support
- **Registry**: Public registry for sharing and reusing Experts

## Repository Structure

```
perstack/
├── packages/
│   ├── core/           # Schemas, types (single source of truth)
│   ├── runtime/        # Expert execution engine
│   ├── api-client/     # Registry API client
│   ├── base/           # Built-in MCP tools (file ops, exec, etc.)
│   ├── tui/            # Terminal UI components
│   └── perstack/       # CLI entry point
├── docs/               # Documentation site (Next.js)
├── scripts/            # Build/validation scripts
└── demo/               # Demo assets
```

## Package Details

### @perstack/core

Centralized schema definitions and type contracts. **Single source of truth** for all cross-package types.

See: `packages/core/README.md`, `CONTRIBUTING.md`

### @perstack/runtime

The execution engine for Perstack agents.

See: `packages/runtime/README.md`

Related docs:
- `docs/content/understanding-perstack/runtime.mdx`
- `docs/content/using-experts/running-experts.mdx`
- `docs/content/using-experts/state-management.mdx`

### @perstack/api-client

TypeScript client for Perstack API (Registry and Studio).

See: `packages/api-client/README.md`

Related docs:
- `docs/content/references/registry-api.mdx`

### @perstack/base

Built-in MCP tools for Perstack agents.

See: `packages/base/README.md`

Related docs:
- `docs/content/making-experts/base-skill.mdx`

**Important:** Tool schemas are defined inline for MCP SDK registration. Do NOT export them.

### @perstack/tui

Internal TUI components for CLI.

See: `packages/tui/README.md`

### perstack (CLI)

Command-line interface for running and managing Experts.

See: `packages/perstack/README.md`

Related docs:
- `docs/content/references/cli.mdx`

## Package Dependency Graph

```
@perstack/core (schemas, types)
    │
    ├─→ @perstack/runtime
    ├─→ @perstack/api-client
    ├─→ @perstack/tui
    └─→ perstack (CLI)

@perstack/base (standalone, tool schemas inline)
```

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm test             # Run unit tests
pnpm format-and-lint  # Run Biome linter/formatter
pnpm changeset        # Create changeset for versioning
```

## Code Style

- TypeScript strict mode
- Biome for formatting/linting
- Zod for schema validation
- Only English in code

### Type Safety (CRITICAL)

**Complete type safety is mandatory.** The following are strictly prohibited:

- Using `any` type
- Using `as` type assertions (except when absolutely necessary and justified)
- Using `@ts-ignore` or `@ts-expect-error`
- Using non-null assertions (`!`) without proper validation

**Always run `pnpm typecheck` before committing.** Type errors are blocking issues.

### Comments Policy

**Principle:** Code that requires comments to be understood is poorly written code.

- Do NOT write comments by default
- Comments are allowed ONLY when:
  - The logic is fundamentally complex (algorithmic complexity, mathematical formulas)
  - External constraints force unintuitive implementations (API quirks, workarounds for bugs)
  - Explaining "why" something is done in an unusual way
- Never write comments that explain "what" the code does (the code should be self-explanatory)

### Blank Lines Policy

**Principle:** Use blank lines to separate logical sections, not to fragment related code.

**DO use blank lines:**
- After import statements (one blank line)
- Between functions/methods (one blank line)
- Between major logical sections within a function

**DO NOT use blank lines:**
- Between closely related statements (consecutive variable declarations, chained operations)
- Inside control flow blocks (`if`/`else`, `switch`/`case`, `try`/`catch`)
- Between a condition and its immediate consequence

**Example (good):**
```typescript
import { foo } from "foo"
import { bar } from "bar"

export function process(input: string): Result {
  const validated = validate(input)
  const normalized = normalize(validated)
  const parsed = parse(normalized)

  if (!parsed.isValid) {
    throw new Error("Invalid input")
  }

  const result = transform(parsed)
  return result
}
```

**Example (bad):**
```typescript
export function process(input: string): Result {
  const validated = validate(input)

  const normalized = normalize(validated)

  const parsed = parse(normalized)

  if (!parsed.isValid) {

    throw new Error("Invalid input")

  }

  const result = transform(parsed)

  return result
}
```

### Commit Message Format

**Format:** `<Type>: <subject>` (single line only, colon required)

**Types:**
- `Add` - New feature or functionality
- `Update` - Enhancement to existing feature
- `Fix` - Bug fix
- `Remove` - Remove feature or code
- `Refactor` - Code restructuring without behavior change
- `Docs` - Documentation only
- `Test` - Test additions or modifications
- `Chore` - Build, dependencies, tooling

**Rules:**
- **Single line only** — do NOT write multi-line commit messages with body/footer
- **Colon required** — always use `Type: subject` format
- Subject starts with capital letter after colon
- No period at the end
- Keep under 72 characters total
- Use imperative mood ("Add feature" not "Added feature")

**Examples:**
```
Add: DeepSeek provider support
Fix: Memory leak in skill manager cleanup
Update: Expert schema to support metadata field
Remove: Deprecated temperature parameter
Refactor: Runtime state machine
Docs: Update API reference
Test: Add integration tests for delegation
Chore: Update dependencies
```

### Commit Granularity

When the user asks to commit changes:

1. **Do NOT commit all changes at once.** Split into meaningful units.
2. Each commit should represent one logical change (feature, fix, refactor, etc.)
3. The commit history should tell a story of the work progression
4. But do NOT over-split — too many tiny commits make history hard to follow

**Good split:**
```
Add: Expert validation schema
Add: Expert validation tests
Update: CLI to use new validation
```

**Bad split (too granular):**
```
Add name field to schema
Add version field to schema
Add description field to schema
...
```

**Bad (monolithic):**
```
Add expert validation with tests and CLI integration
```

### Before Committing

1. Run `pnpm typecheck` (MANDATORY - type errors are blocking)
2. Review recent commit history: `git log --oneline -10`
3. Match the style of existing commits
4. Ensure your message clearly describes the change

## Versioning Strategy

### The Contract System

`@perstack/core`'s version is the contract:
```
major.minor.patch
  │     │     │
  │     │     └─ Implementation quality (bugs, performance)
  │     └─────── Interface additions (backward compatible)
  └───────────── Interface changes (breaking)
```

**Rule:** All packages share the same `major.minor`. Independent patches allowed.

### Schema Change Rules

| Change Type        | Version Bump | Affects        |
| ------------------ | ------------ | -------------- |
| Add optional field | Minor        | ALL packages   |
| Add required field | Major        | ALL packages   |
| Remove any field   | Major        | ALL packages   |
| Change field type  | Major        | ALL packages   |
| Bug fix            | Patch        | Single package |

### Changeset Workflow

When changes require a changeset, create a changeset file directly in `.changeset/` directory.

**Changeset file format:**
```markdown
---
"@perstack/runtime": patch
---

Fix memory leak in skill manager cleanup when MCP connection fails
```

**Bug fix:**
- Packages: Only affected package
- Type: patch

**New feature:**
- Packages: ALL packages (@perstack/core, @perstack/runtime, @perstack/api-client, @perstack/base, @perstack/tui, perstack)
- Type: minor (for all)

**Breaking change:**
- Packages: ALL packages
- Type: major (for all)

### Two-Stage Release Flow

Releases are automated via GitHub Actions:

1. **PR merged to main** (with changeset)
   - Release workflow creates "Version Packages" PR automatically
   - This PR updates versions and CHANGELOGs

2. **Version Packages PR merged**
   - Release workflow publishes to npm
   - Git tags and GitHub Releases are created automatically

**No manual `pnpm release` needed.** The CI handles everything after changesets are merged.

### Changelog Message Format

**Single change:**
```
Remove workspace parameter from runtime

The runtime now executes in the current working directory instead of
accepting a workspace parameter.
```

**Multiple changes (use categories):**
```
Add health check tool, Zod error formatting, and refactor SkillManager

Features:

- Add healthCheck tool to @perstack/base for runtime health monitoring
- Add friendly Zod error formatting utility to @perstack/core

Improvements:

- Refactor SkillManager into separate classes
- Use discriminatedUnion for provider settings
```

**Rules:**
- First line: Brief summary (single sentence)
- Blank line after summary if adding details
- Use "Features:", "Improvements:", "Fixes:" categories for multiple changes
- Each bullet point starts with verb (Add, Remove, Fix, Update, Refactor)
- Keep concise — changelog is for users, not implementation details

## Documentation First (CRITICAL)

**Every code change must be accompanied by documentation updates.**

When making changes, update ALL relevant documentation:

| Change Type                | Documentation to Update                                         |
| -------------------------- | --------------------------------------------------------------- |
| New feature                | `docs/`, `README.md`, affected `packages/**/README.md`          |
| API change                 | `docs/references/`, affected package README                     |
| New tool in @perstack/base | `docs/making-experts/base-skill.mdx`, `packages/base/README.md` |
| Schema change              | `docs/references/`, `packages/core/README.md`                   |
| CLI change                 | `docs/references/cli.mdx`, `packages/perstack/README.md`        |
| New Expert feature         | `docs/making-experts/`, root `README.md` if significant         |

**Documentation locations:**
- `docs/` - Main documentation site
- `README.md` - Project overview and quick start
- `packages/**/README.md` - Package-specific documentation

## Common Tasks

### Adding a New Feature

1. Edit code in appropriate package(s)
2. Run `pnpm typecheck && pnpm test`
3. Update related documentation
4. Create changeset (ALL packages, minor)
5. Commit with `Add: <subject>` format

### Fixing a Bug

1. Edit code and add test
2. Run `pnpm typecheck && pnpm test`
3. Create changeset (affected package only, patch)
4. Commit with `Fix: <subject>` format

### Modifying Core Schemas

1. Edit `packages/core/src/schemas/`
2. Update all dependent packages if needed
3. Run `pnpm typecheck && pnpm test`
4. Update `docs/references/` and `packages/core/README.md`
5. Create changeset (ALL packages, minor for optional, major for breaking)

### Adding a New Tool to @perstack/base

1. Create tool file in `packages/base/src/tools/`
2. Define schema inline (do NOT export)
3. Register in MCP server (`packages/base/bin/server.ts`)
4. Add tests (`*.test.ts`)
5. Update `docs/content/making-experts/base-skill.mdx` and `packages/base/README.md`

### Creating Issues

When creating GitHub issues, follow the guidelines in `CONTRIBUTING.md` section "Writing Good Issues".

Key points:
- **One issue = one PR** — each issue should be completable in a single PR
- **Title describes the goal**, not implementation details (no file names in titles)
- **Use prefixes**: `Fix:`, `Refactor:`, `Add:`, `Update:`

## Testing

- **Unit tests:** Vitest (`*.test.ts` files), run with `pnpm test`
- **E2E tests:** Manual testing by following `E2E.md` — agent should read and execute the procedures
- **Coverage:** V8 provider, lcov output

### Unit Test Scope

Unit tests target pure functions, schema validations, and isolated logic.

**In scope (unit testable):**
- Zod schema parsing and transforms (`packages/core/src/schemas/`)
- Pure utility functions (`parseExpertKey`, `createEvent`, etc.)
- State machine logic functions (`packages/runtime/src/states/*.ts`)
- Message conversion functions
- API response parsing

**Out of scope (use E2E instead):**

| File/Area                                            | Reason                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `packages/runtime/src/runtime.ts` (`run` function)   | Complex state machine orchestration with MCP connections |
| `packages/runtime/src/skill-manager.ts` (MCP init)   | Requires live MCP server connections                     |
| `packages/base/bin/server.ts`                        | MCP server entry point                                   |
| `packages/base/src/tools/*.ts` (`registerXxx`)       | MCP SDK registration, tested via E2E                     |
| `packages/perstack/` (CLI commands)                  | CLI entry points, tested via E2E                         |
| `packages/tui/`                                      | React/Ink UI components                                  |
| `packages/api-client/v1/client.ts` (method wrappers) | Simple delegation to tested functions                    |
| `packages/core/src/schemas/skill-manager.ts`         | Type definitions only, no runtime code                   |

When adding new code, follow this principle: **If it requires MCP connections or CLI invocation to test meaningfully, skip unit tests and rely on E2E.**

### Test File Format

**Blank lines in test files:** Add a blank line before `describe()` and `it()` blocks for readability.

**Rules:**
- NO blank line immediately after `describe()` opening brace
- Blank line BEFORE each `it()` block (except the first one in a describe)
- Blank line BEFORE nested `describe()` blocks

**Example (good):**
```typescript
import { describe, expect, it } from "vitest"

describe("MyModule", () => {
  it("does something", () => {
    expect(true).toBe(true)
  })

  it("does another thing", () => {
    expect(1 + 1).toBe(2)
  })

  describe("nested suite", () => {
    it("handles edge case", () => {
      expect("test").toBeDefined()
    })

    it("handles another case", () => {
      expect(1).toBe(1)
    })
  })
})
```

**Example (bad):**
```typescript
describe("MyModule", () => {

  it("does something", () => {  // BAD: blank line after describe
    expect(true).toBe(true)
  })
  it("does another thing", () => {  // BAD: no blank line before it
    expect(1 + 1).toBe(2)
  })
  describe("nested suite", () => {  // BAD: no blank line before describe
    it("handles edge case", () => {
      expect("test").toBeDefined()
    })
  })
})
```

## CI Pipeline

- **quality**: Lint, format, typecheck, knip, version sync, changeset validation, schema diff
- **test**: Unit tests with coverage
- **build**: Build all packages
- **changeset-check**: Verifies changeset exists in PR (skipped for Dependabot/release PRs)
- **release**: Creates Version PR or publishes to npm (runs on main branch only)

All checks must pass before merge.

### Before Pushing (MANDATORY)

Run ALL CI checks locally before pushing:

```bash
pnpm format-and-lint    # Lint & format check
pnpm typecheck          # Type check (CRITICAL)
pnpm check-deps         # Check unused dependencies
pnpm reset && pnpm test # Run tests
pnpm build              # Build all packages
```

**All commands must pass.** If any fails, fix before pushing.

### E2E Testing (MANDATORY)

After build passes, run E2E tests by following `E2E.md`:

```bash
pnpm build  # Must build first
# Then run E2E tests as documented in E2E.md
```

**E2E tests must pass before pushing.** This catches runtime issues that unit tests miss.

## Expert Definition Format

Experts are defined in `perstack.toml`:

```toml
model = "claude-sonnet-4-5"
temperature = 0.3

[provider]
providerName = "anthropic"

[experts."expert-name"]
version = "1.0.0"
description = "Short description"
instruction = """
Detailed instructions for the Expert
"""
delegates = ["other-expert"]

[experts."expert-name".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["attemptCompletion", "think"]
```

## Important Files

| File                              | Purpose                       |
| --------------------------------- | ----------------------------- |
| `perstack.toml`                   | Local Expert definitions      |
| `packages/core/src/schemas/`      | All shared type definitions   |
| `packages/runtime/src/runtime.ts` | Core runtime logic            |
| `packages/runtime/src/states/`    | State machine implementations |
| `packages/base/src/tools/`        | Built-in tool implementations |
| `packages/perstack/bin/cli.ts`    | CLI entry point               |
| `.changeset/`                     | Version management            |
| `CONTRIBUTING.md`                 | Full contribution guidelines  |

## Environment Variables

| Variable                       | Provider          |
| ------------------------------ | ----------------- |
| `ANTHROPIC_API_KEY`            | Anthropic         |
| `OPENAI_API_KEY`               | OpenAI            |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google            |
| `PERSTACK_API_KEY`             | Perstack Registry |

## Pre-commit Checklist

- [ ] `pnpm typecheck` passes (MANDATORY)
- [ ] `pnpm test` passes
- [ ] `pnpm format-and-lint` passes
- [ ] Review commit history (`git log --oneline -10`) and match style
- [ ] Commits are split into meaningful units (not monolithic)
- [ ] Related documentation updated (`docs/`, `README.md`, `packages/**/README.md`)
- [ ] Changeset created if needed

## Pre-push Checklist

**IMPORTANT:** Before pushing, read `CONTRIBUTING.md` for detailed versioning and type management rules.

- [ ] `pnpm format-and-lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm check-deps` passes
- [ ] `pnpm reset && pnpm test` passes
- [ ] `pnpm build` passes
- [ ] E2E tests pass (follow `E2E.md`)
- [ ] Versioning rules in `CONTRIBUTING.md` are followed
