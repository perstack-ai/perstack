# GitHub

## Git Operations

**Only commit and push when explicitly instructed by the user.**

Before committing:

1. Check current branch with `git branch --show-current`
2. Verify you are on the correct branch
3. Review staged changes with `git status`

Never commit or push autonomously without explicit user instruction.

## The GitHub Composition Model

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Human requests issue ◄──── Entry point                    │
│         │                                                   │
│         ▼                                                   │
│   Issue Writer Agent                                        │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                           │
│   │   Issue     │                                           │
│   └─────────────┘                                           │
│         │                                                   │
│         ▼                                                   │
│   Implementation Agent                                      │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                           │
│   │     PR      │ ◄──── Bugbot reviews code                 │
│   └─────────────┘       QA Agent verifies tests             │
│         │               PR Review Agent checks standards    │
│         ▼                                                   │
│   Human approves merge ◄──── Exit point                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Agents operate asynchronously. GitHub is the shared state. Humans intervene at defined checkpoints, not continuously.

## Commit Messages

Follow conventional commits:

```
feat: add metadata support to experts
fix: resolve memory leak in cleanup
docs: update API documentation
refactor: simplify schema validation
test: add integration tests
chore: update dependencies
```

---

## Development Workflow

### 1. Branch and Edit

```bash
git checkout -b fix/memory-leak
# ... edit code, add tests ...
```

### 2. Create Changeset

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

---

## Issue Writing

### Issue Granularity

Each issue should represent **one actionable unit of work** that can be completed in a single PR.

**Good scope:**

- Fix a specific bug in one component
- Extract one shared utility or component
- Add one new feature with clear boundaries

**Bad scope:**

- "Refactor TUI package" (too broad)
- "Fix all bugs" (not actionable)
- "Improve code quality" (vague)

### Issue Title Guidelines

Titles should describe **what to solve**, not implementation details.

| Bad (implementation details)         | Good (problem/goal focused)                        |
| ------------------------------------ | -------------------------------------------------- |
| Fix `apps/tag/app.tsx` line 242      | Fix: Tag comparison fails when tags are reordered  |
| Refactor `ExpertSelector` in 4 files | Refactor: Share ExpertSelector across wizards      |
| Add `useInput` to error state        | Fix: Wizard ignores keyboard input on error screen |

**Why:** File names and line numbers change. The problem statement remains stable.

### Issue Types

- `Fix:` for bugs
- `Feat:` for features
- `Refactor:` for refactoring
- `[SEC-XXX] [Severity]:` for security issues

### Bug Report Template

```markdown
## Title

Fix: [What is broken]

## Labels

bug, [package-name], [priority]

## Description

Brief explanation of the bug.

### Current Behavior

What happens now.

### Expected Behavior

What should happen.

### Steps to Reproduce

1. Step one
2. Step two
3. ...

### Environment

- OS: [e.g., macOS 14.0]
- Node: [e.g., 22.0.0]
- Perstack: [e.g., 0.0.46]

### Affected Areas

- List of components/features affected
```

### Feature Request Template

```markdown
## Title

Feat: [What to add]

## Labels

enhancement, [package-name], [priority]

## Description

Brief explanation of the feature.

### Use Case

Why this feature is needed.

### Proposed Solution

High-level solution direction.

### Alternatives Considered

Other approaches and why they were rejected.

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

### Refactoring Template

```markdown
## Title

Refactor: [What to improve]

## Labels

refactor, [package-name]

## Description

What needs to be refactored and why.

### Current State

Description of current implementation.

### Target State

Description of desired implementation.

### Affected Areas

- List of files/components affected

### Acceptance Criteria

- [ ] No behavior changes
- [ ] Tests still pass
- [ ] [Specific improvements]
```

### Security Issue Template

```markdown
## Title

[SEC-XXX] [Severity]: [Brief description]

## Labels

security, [severity], [package-name]

## Description

Brief explanation of the vulnerability.

### Affected Code

File paths and line numbers.

### Attack Scenario

1. How an attacker could exploit this
2. ...

### Impact

What damage could result.

### Recommendation

Suggested fix.

### Risk Mitigation (Current)

Any existing mitigations.

### Reference

Link to audit report if applicable.
```

**Severity levels:**

- `Critical`: Immediate exploitation possible, severe impact
- `High`: Exploitable with moderate effort, significant impact
- `Medium`: Requires specific conditions, moderate impact
- `Low`: Minor issues, limited impact

### Breaking Down Large Changes

When a change touches multiple areas, split into dependent issues:

```
Issue #1: Extract shared types for wizards
Issue #2: Extract shared utility functions (depends on #1)
Issue #3: Extract shared components (depends on #1, #2)
```

Link issues with "depends on #X" or "blocked by #X" in the description.

---

## Pull Request

### PR Body

Include:

- Summary of changes
- Issue reference: `Closes #<number>`
- Test plan

### Review Checklist

#### Code Quality

- [ ] Code follows existing patterns
- [ ] No unnecessary complexity
- [ ] Clear variable and function names
- [ ] No commented-out code
- [ ] No debug statements

#### Type Safety

- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper type annotations
- [ ] Types imported from `@perstack/core`

#### Testing

- [ ] New code has tests
- [ ] Tests cover edge cases
- [ ] No flaky tests introduced
- [ ] Coverage not decreased

#### Security

- [ ] No secrets in code
- [ ] Environment variables handled safely
- [ ] Path validation for file operations
- [ ] Input validation present
- [ ] SECURITY.md updated if new limitations discovered

#### Documentation

- [ ] README updated if needed
- [ ] JSDoc for public APIs
- [ ] Changeset created with appropriate bump

#### Versioning

- [ ] Changeset bump type is correct
- [ ] All affected packages included in changeset
- [ ] Breaking changes documented with migration guide

### CI Status Checks

Verify all checks pass:

```bash
gh pr checks <number>
```

| Check                | Requirement                 |
| -------------------- | --------------------------- |
| Build                | Must pass                   |
| Lint / Format / Knip | Must pass                   |
| Test                 | Must pass                   |
| CI Success           | Must pass                   |
| Codecov              | No coverage decrease        |
| Changeset Check      | Present for non-doc changes |

### Codecov Review

If Codecov shows decreased coverage:

1. Check which lines are uncovered
2. Request tests for those lines
3. Do not approve until coverage is restored

### Cursor Bugbot Comments

Cursor Bugbot may leave comments on the PR. Each comment should be:

1. Reviewed for validity
2. Addressed if valid
3. Dismissed with explanation if false positive

To fetch all comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments
```

### Security Review

For security-sensitive changes, verify:

#### Environment Variables

```typescript
if (isProtectedVariable(key)) {
  throw new Error("Cannot override protected variable")
}
```

#### Path Handling

```typescript
const resolved = await validateAndResolvePath(path, workspacePath)
```

#### Command Execution

```typescript
execFile(command, args)
```

Never use `exec()` with shell injection risk.

### Changeset Review

Verify changeset is correct:

#### Patch (bug fix)

```markdown
---
"@perstack/runtime": patch
---

Fixed memory leak in skill manager cleanup
```

#### Minor (new feature)

```markdown
---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/base": minor
...all packages...
---

Added streaming support to expert execution
```

#### Major (breaking change)

```markdown
---
"@perstack/core": major
...all packages...
---

BREAKING: Removed deprecated temperature field

Migration:
- Before: `{ temperature: 0.7 }`
- After: `{ providerConfig: { temperature: 0.7 } }`
```

### Approval Flow

1. Review all code changes
2. Verify CI passes
3. Verify Codecov has no warnings
4. Verify all Bugbot comments addressed
5. Leave approval or request changes

#### Requesting Changes

```bash
gh pr review <number> --request-changes --body "..."
```

#### Approving

```bash
gh pr review <number> --approve --body "LGTM"
```

### Merge Strategy

After approval:

```bash
gh pr merge <number> --squash --delete-branch
```

- Use **squash merge** to keep history clean
- Delete branch after merge

---

## Labels

### Type Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `refactor` - Code improvement without behavior change
- `docs` - Documentation only
- `chore` - Maintenance tasks
- `security` - Security-related

### Package Labels

- `@perstack/api-client`
- `@perstack/base`
- `@perstack/claude-code`
- `@perstack/core`
- `@perstack/cursor`
- `@perstack/docker`
- `@perstack/gemini`
- `@perstack/runner`
- `@perstack/runtime`
- `@perstack/filesystem-storage`
- `@perstack/tui`
- `create-expert`
- `perstack` (CLI)

### Priority Labels

- `priority: critical` - Must fix immediately
- `priority: high` - Should fix soon
- `priority: medium` - Normal priority
- `priority: low` - Nice to have

---

## Quick Reference

### Issue Commands

```bash
gh issue create --title "Fix: [description]" --label "bug" --body "..."
gh issue create --title "Feat: [description]" --label "enhancement" --body "..."
gh issue create --title "[SEC-XXX] [Severity]: [description]" --label "security" --body "..."
```

### PR Review Commands

```
1. CHECK CI STATUS
   gh pr checks <number>

2. REVIEW CODE
   - Quality, types, tests, security, docs

3. CHECK CODECOV
   - No coverage decrease

4. CHECK BUGBOT
   - All comments addressed

5. VERIFY CHANGESET
   - Correct bump type
   - All packages included

6. APPROVE OR REQUEST CHANGES
   gh pr review <number> --approve

7. MERGE
   gh pr merge <number> --squash
```
