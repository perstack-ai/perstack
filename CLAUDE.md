# CLAUDE.md

Your configuration source is the `.agent/` directory.

## Rules

| File                           | When to Read                        |
| ------------------------------ | ----------------------------------- |
| `.agent/rules/how-you-work.md` | Always, before starting any task    |
| `.agent/rules/coding-style.md` | When writing code                   |
| `.agent/rules/versioning.md`   | When creating changesets            |
| `.agent/rules/e2e.md`          | When running or writing E2E tests   |
| `.agent/rules/debugging.md`    | When debugging Perstack executions  |
| `SECURITY.md`                  | When touching security-related code |

## GitHub Operations

| File                                      | When to Read           |
| ----------------------------------------- | ---------------------- |
| `.agent/rules/github.md#issue-writing`    | When creating an issue |
| `.agent/rules/github.md#pull-request`     | When creating a PR     |
| `.agent/rules/github.md#review-checklist` | When reviewing a PR    |
| `.agent/rules/github.md#ci-status-checks` | When CI fails          |

## Workflows

| File                                  | When to Read                        |
| ------------------------------------- | ----------------------------------- |
| `.agent/workflows/implementation.md`  | When implementing a feature or fix  |
| `.agent/workflows/qa.md`              | When running QA                     |
| `.agent/workflows/audit.md`           | When auditing security              |
| `.agent/workflows/creating-expert.md` | When creating an Expert             |
| `.agent/workflows/api-client.md`      | When updating @perstack/api-client  |

## Project

- **Name**: Perstack
- **Model**: claude-sonnet-4-5
- **Runtime**: docker (recommended)
