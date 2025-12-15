# PR Review Workflow

This document defines the pull request review workflow for the Perstack project.

## Review Checklist

### Code Quality

- [ ] Code follows existing patterns
- [ ] No unnecessary complexity
- [ ] Clear variable and function names
- [ ] No commented-out code
- [ ] No debug statements

### Type Safety

- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper type annotations
- [ ] Types imported from `@perstack/core`

### Testing

- [ ] New code has tests
- [ ] Tests cover edge cases
- [ ] No flaky tests introduced
- [ ] Coverage not decreased

### Security

- [ ] No secrets in code
- [ ] Environment variables handled safely
- [ ] Path validation for file operations
- [ ] Input validation present
- [ ] SECURITY.md updated if new limitations discovered

### Documentation

- [ ] README updated if needed
- [ ] JSDoc for public APIs
- [ ] Changeset created with appropriate bump

### Versioning

- [ ] Changeset bump type is correct
- [ ] All affected packages included in changeset
- [ ] Breaking changes documented with migration guide

## CI Status Checks

Verify all checks pass:

```bash
gh pr checks <number>
```

| Check | Requirement |
| --- | --- |
| Build | Must pass |
| Lint / Format / Knip | Must pass |
| Test | Must pass |
| CI Success | Must pass |
| Codecov | No coverage decrease |
| Changeset Check | Present for non-doc changes |

## Codecov Review

If Codecov shows decreased coverage:

1. Check which lines are uncovered
2. Request tests for those lines
3. Do not approve until coverage is restored

## Cursor Bugbot Comments

Cursor Bugbot may leave comments on the PR. Each comment should be:

1. Reviewed for validity
2. Addressed if valid
3. Dismissed with explanation if false positive

To fetch all comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments
```

## Security Review

For security-sensitive changes, verify:

### Environment Variables

```typescript
// Good: Using protected variable list
if (isProtectedVariable(key)) {
  throw new Error("Cannot override protected variable")
}

// Bad: No protection
env[key] = value
```

### Path Handling

```typescript
// Good: Validate and resolve path
const resolved = await validateAndResolvePath(path, workspacePath)

// Bad: Direct path usage
fs.readFile(path)
```

### Command Execution

```typescript
// Good: execFile (no shell)
execFile(command, args)

// Bad: exec (shell injection risk)
exec(`${command} ${args.join(" ")}`)
```

## Changeset Review

Verify changeset is correct:

### Patch (bug fix)

```markdown
---
"@perstack/runtime": patch
---

Fixed memory leak in skill manager cleanup
```

### Minor (new feature)

```markdown
---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/base": minor
...all packages...
---

Added streaming support to expert execution
```

### Major (breaking change)

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

## Approval Flow

1. Review all code changes
2. Verify CI passes
3. Verify Codecov has no warnings
4. Verify all Bugbot comments addressed
5. Leave approval or request changes

### Requesting Changes

```bash
gh pr review <number> --request-changes --body "..."
```

### Approving

```bash
gh pr review <number> --approve --body "LGTM"
```

## Merge Strategy

After approval:

```bash
gh pr merge <number> --squash --delete-branch
```

- Use **squash merge** to keep history clean
- Delete branch after merge

## Quick Reference

```
┌─────────────────────────────────────────────────┐
│  1. CHECK CI STATUS                             │
│     gh pr checks <number>                       │
├─────────────────────────────────────────────────┤
│  2. REVIEW CODE                                 │
│     - Quality, types, tests, security, docs     │
├─────────────────────────────────────────────────┤
│  3. CHECK CODECOV                               │
│     - No coverage decrease                      │
├─────────────────────────────────────────────────┤
│  4. CHECK BUGBOT                                │
│     - All comments addressed                    │
├─────────────────────────────────────────────────┤
│  5. VERIFY CHANGESET                            │
│     - Correct bump type                         │
│     - All packages included                     │
├─────────────────────────────────────────────────┤
│  6. APPROVE OR REQUEST CHANGES                  │
│     gh pr review <number> --approve             │
├─────────────────────────────────────────────────┤
│  7. MERGE                                       │
│     gh pr merge <number> --squash               │
└─────────────────────────────────────────────────┘
```
