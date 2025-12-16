# Implementation Workflow

This document defines the autonomous workflow for implementing features and fixes.

> **Re-read this document before starting any implementation to avoid drift.**

## Prerequisites

- Read `.agent/rules/` for coding standards and conventions
- Understand the security model: [SECURITY.md](../../SECURITY.md)

## Input

You will receive:

- Issue number (e.g., `#123`)

## Phase 1: Planning

Follow these steps **strictly in order**:

1. **Fetch the issue**

   ```bash
   gh issue view <number>
   ```

2. **First ultrathink** — Draft initial plan based on issue description

3. **Read documentation**
   - `./README.md`
   - `./docs/**/*.md`
   - Any files referenced in the issue

4. **Second ultrathink** — Refine plan with documentation context

5. **Read relevant code thoroughly**
   - Follow code paths
   - Understand existing patterns
   - Identify affected areas

6. **Third ultrathink** — Finalize implementation plan

7. **Switch to Plan mode** — Present the plan for approval

### Planning Constraints

- **No technical debt**: Implementation must be clean and maintainable
- **No security risks**: Follow security guidelines in [SECURITY.md](../../SECURITY.md)
- **No shortcuts**: Large changes are acceptable if necessary

## Phase 2: Preparation

After plan approval:

```bash
git fetch origin main
git checkout -b <branch-name>
```

Branch naming:

- `feat/<description>` for features
- `fix/<description>` for bug fixes
- `refactor/<description>` for refactoring
- `docs/<description>` for documentation

## Phase 3: Implementation

Work autonomously until completion conditions are met.

### Order of Changes

**Always follow this order:**

1. **Documentation first** — Update docs before writing code
2. **Tests second** — Write/update tests before implementation
3. **Implementation last** — Code comes after docs and tests

This order ensures:

- Clear understanding of requirements before coding
- Test-driven development catches edge cases early
- Documentation stays in sync with code

### Guidelines

- Follow [coding-style.md](../rules/coding-style.md) for code style
- Follow existing code patterns in the codebase
- Create changeset if required (see [versioning.md](../rules/versioning.md))

### When Stuck

If you encounter issues:

1. **ultrathink** — Analyze the problem deeply
2. If unresolved, **ultrathink again** — Different angles often reveal solutions
3. Repeat as needed — Persistent thinking usually finds the answer

### Autonomous Debugging

**Do not ask humans for debugging help.** Debug autonomously using `perstack run`.

Raw `perstack run` output contains massive JSON events that will explode your context. Always pipe through a filter script.

**Usage pattern:**

```bash
perstack run <expert> "<query>" 2>&1 | npx tsx filter.ts
```

**Create a filter script** (example: `filter.ts`):

```typescript
import * as readline from "node:readline"

function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string
  const expertKey = event.expertKey as string
  switch (type) {
    case "startRun": return `[${expertKey}] Starting...`
    case "callTool": {
      const toolName = (event.toolCall as Record<string, unknown>)?.toolName as string
      return `[${expertKey}] ${toolName}`
    }
    case "completeRun": return `[${expertKey}] Done`
    case "errorRun": return `[${expertKey}] Error: ${event.error}`
    default: return null
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })
rl.on("line", (line) => {
  try {
    const event = JSON.parse(line)
    const formatted = formatEvent(event)
    if (formatted) console.log(formatted)
  } catch {}
})
```

See `examples/gmail-assistant/filter.ts` for a comprehensive example.

### Changeset Rules

| Change Type        | Changeset Required | Version Bump                  |
| ------------------ | ------------------ | ----------------------------- |
| Bug fix            | Yes                | patch (affected package only) |
| New feature        | Yes                | minor (all packages)          |
| Breaking change    | Yes                | major (all packages)          |
| Documentation only | Optional           | patch                         |

```bash
pnpm changeset
```

## Phase 4: Validation

Before creating PR, ensure:

```bash
pnpm typecheck        # Type checking
pnpm format-and-lint  # Linting and formatting
pnpm test             # Unit tests
pnpm build            # Build all packages
pnpm test:e2e         # E2E tests (full suite)
```

**All checks must pass before proceeding.**

### Never Modify Config to Pass Checks

**Forbidden actions:**

- Modifying `tsconfig.json` to suppress type errors
- Modifying `biome.json` to disable lint rules
- Modifying `vitest.config.ts` to skip failing tests
- Adding `// @ts-ignore`, `// biome-ignore`, or similar suppressions

**If checks fail, fix the actual code.** Config modifications to bypass checks will be rejected in review.

## Phase 5: Pull Request

Create the PR:

```bash
git add .
git commit -m "<type>: <description>"
git push -u origin <branch-name>
gh pr create --title "<type>: <description>" --body "..."
```

PR body should include:

- Summary of changes
- Issue reference: `Closes #<number>` (must match the issue from Phase 1)
- Test plan

## Phase 6: CI Monitoring

Monitor the PR every 5 minutes until all checks pass:

```bash
gh pr checks <number> --watch
```

### Required Checks

| Check         | Requirement                                            |
| ------------- | ------------------------------------------------------ |
| CI Success    | Must pass                                              |
| Codecov       | **No warnings allowed** — fix any coverage regressions |
| Cursor Bugbot | **All comments must be addressed**                     |

### Handling Codecov Warnings

If Codecov reports decreased coverage:

1. Add tests for uncovered lines
2. Push fixes
3. Wait for Codecov to re-run

**Testing Strategy for Hard-to-Test Code:**

When code requires external dependencies (Docker, network, etc.):

- **Use mock tests** — Mock `spawn`, `ChildProcess`, or other system calls
- **Don't exclude from coverage** — Excluding files masks real coverage issues
- **Don't skip tests** — Write mock-based tests to verify logic paths

### Handling Cursor Bugbot Comments

Every 5 minutes:

1. Fetch all PR comments

   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments
   ```

2. Identify Cursor Bugbot comments
3. Address each issue
4. Push fixes

## Phase 7: Handoff

When all checks are green and all comments addressed:

1. Report completion to the human
2. **Wait for human approval**
3. **Do not merge until explicitly approved**

After approval:

```bash
gh pr merge <number> --squash --delete-branch
```

## Quick Reference

```
1. PLANNING
   gh issue view → ultrathink → read docs →
   ultrathink → read code → ultrathink → plan

2. PREPARATION
   git fetch && git checkout -b <branch>

3. IMPLEMENTATION
   Docs → Tests → Code → Changeset
   (ultrathink when stuck)

4. VALIDATION
   typecheck → format-and-lint → test →
   build → e2e

5. PULL REQUEST
   commit → push → gh pr create (Closes #N)

6. CI MONITORING
   gh pr checks --watch (every 5 min)
   Fix: Codecov, Bugbot comments

7. HANDOFF
   Report → Wait for approval → Merge
```
