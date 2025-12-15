# Issue Writing Guide

This document defines how to write effective issues for the Perstack project.

## Issue Granularity

Each issue should represent **one actionable unit of work** that can be completed in a single PR.

**Good scope:**
- Fix a specific bug in one component
- Extract one shared utility or component
- Add one new feature with clear boundaries

**Bad scope:**
- "Refactor TUI package" (too broad)
- "Fix all bugs" (not actionable)
- "Improve code quality" (vague)

## Issue Title Guidelines

Titles should describe **what to solve**, not implementation details.

| Bad (implementation details) | Good (problem/goal focused) |
| --- | --- |
| Fix `apps/tag/app.tsx` line 242 | Fix: Tag comparison fails when tags are reordered |
| Refactor `ExpertSelector` in 4 files | Refactor: Share ExpertSelector across wizards |
| Add `useInput` to error state | Fix: Wizard ignores keyboard input on error screen |

**Why:** File names and line numbers change. The problem statement remains stable.

## Issue Types

### Bug Reports

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

### Feature Requests

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

### Refactoring

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

## Security Issues

Security issues use a special format with persistent IDs.

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

**Example:**
```
[SEC-001] Medium: NodeSource setup script piped to bash
```

## Breaking Down Large Changes

When a change touches multiple areas, split into dependent issues:

```
Issue #1: Extract shared types for wizards
Issue #2: Extract shared utility functions (depends on #1)
Issue #3: Extract shared components (depends on #1, #2)
```

Link issues with "depends on #X" or "blocked by #X" in the description.

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
- `@perstack/storage`
- `@perstack/tui`
- `create-expert`
- `perstack` (CLI)

### Priority Labels
- `priority: critical` - Must fix immediately
- `priority: high` - Should fix soon
- `priority: medium` - Normal priority
- `priority: low` - Nice to have

## Quick Reference

```bash
# Create a bug report
gh issue create --title "Fix: [description]" --label "bug" --body "..."

# Create a feature request
gh issue create --title "Feat: [description]" --label "enhancement" --body "..."

# Create a security issue
gh issue create --title "[SEC-XXX] [Severity]: [description]" --label "security" --body "..."
```
