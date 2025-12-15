# Implementation Workflow

This document defines the autonomous workflow for implementing features and fixes.

> **⚠️ Re-read this document before starting any implementation to avoid drift.**

## Prerequisites

- Read [AGENTS.md](../AGENTS.md) first
- Understand the security model: [SECURITY.md](../SECURITY.md)
- Familiarize with development practices: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Input

You will receive:
- Issue number (e.g., `#123`)
- Reference to `AGENTS.md`

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
- **No security risks**: Follow security guidelines in [SECURITY.md](../SECURITY.md)
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

### Guidelines

- Follow existing code patterns
- Write tests for new functionality
- Update documentation if needed
- Create changeset if required (see [CONTRIBUTING.md](../CONTRIBUTING.md))

### When Stuck

If you encounter issues:

1. **ultrathink** — Analyze the problem deeply
2. If unresolved, **ultrathink again** — Different angles often reveal solutions
3. Repeat as needed — Persistent thinking usually finds the answer

### Changeset Rules

When to create a changeset:

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
pnpm typecheck     # Must pass
pnpm lint          # Must pass
pnpm test          # Must pass
pnpm build         # Must succeed
pnpm test:e2e      # Must pass (run full suite)
```

**All checks must pass before proceeding.**

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
- Related issue (`Closes #<number>`)
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
┌─────────────────────────────────────────────────┐
│  1. PLANNING                                    │
│     gh issue view → ultrathink → read docs →    │
│     ultrathink → read code → ultrathink → plan  │
├─────────────────────────────────────────────────┤
│  2. PREPARATION                                 │
│     git fetch && git checkout -b <branch>       │
├─────────────────────────────────────────────────┤
│  3. IMPLEMENTATION                              │
│     Code → Tests → Docs → Changeset             │
│     (ultrathink when stuck)                     │
├─────────────────────────────────────────────────┤
│  4. VALIDATION                                  │
│     typecheck → lint → test → build → e2e      │
├─────────────────────────────────────────────────┤
│  5. PULL REQUEST                                │
│     commit → push → gh pr create                │
├─────────────────────────────────────────────────┤
│  6. CI MONITORING                               │
│     gh pr checks --watch (every 5 min)          │
│     Fix: Codecov, Bugbot comments               │
├─────────────────────────────────────────────────┤
│  7. HANDOFF                                     │
│     Report → Wait for approval → Merge          │
└─────────────────────────────────────────────────┘
```
