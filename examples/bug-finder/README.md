# Bug Finder

Codebase analyzer that systematically finds potential bugs through code review.

|              |                                             |
| ------------ | ------------------------------------------- |
| **Purpose**  | Find potential bugs in codebases            |
| **Expert**   | `bug-finder`                                |
| **Skills**   | `@perstack/base` only                       |
| **Sandbox**  | Docker runtime with `--workspace`           |
| **Registry** | Local only                                  |

## Quick Start

### Local Usage

```bash
cd examples/bug-finder
export ANTHROPIC_API_KEY=your-key

npx perstack start bug-finder "Find 3 bugs in src/"
```

### Docker Runtime with External Project

Analyze any project on your system using the `--workspace` option:

```bash
npx perstack start --runtime docker --workspace /path/to/project bug-finder "Find bugs in the codebase"
```

The `--workspace` option mounts the specified directory into the container, allowing the Expert to analyze code outside the current working directory.

## Bug Categories

The Expert looks for these common bug patterns:

| Category             | Examples                                          |
| -------------------- | ------------------------------------------------- |
| Logic errors         | Incorrect conditions, wrong operators             |
| Unhandled edge cases | null/undefined, empty arrays, boundary values     |
| Type safety issues   | Type coercion, any types, missing null checks     |
| Resource leaks       | Unclosed connections, missing cleanup             |
| Race conditions      | async/await issues, shared state                  |
| Off-by-one errors    | Array indices, loop bounds                        |
| Error handling gaps  | Swallowed errors, missing try-catch               |
| Security issues      | Injection, path traversal, unsanitized input      |

## Output Format

Each bug is reported with:

```
## Bug #N: [Brief Title]
- **File**: path/to/file.ts:LINE
- **Severity**: Critical/High/Medium/Low
- **Description**: What the bug is
- **Impact**: What could go wrong
- **Fix**: How to fix it
```

## Example Queries

| Query                                  | What happens                              |
| -------------------------------------- | ----------------------------------------- |
| "Find 3 bugs in src/"                  | Finds top 3 bugs in src directory         |
| "Find security issues in lib/"         | Focuses on security vulnerabilities       |
| "Analyze auth.ts for bugs"             | Reviews a specific file                   |
| "Find race conditions in async code"   | Looks for specific bug category           |

## Files

| File            | Purpose           |
| --------------- | ----------------- |
| `perstack.toml` | Expert definition |
| `README.md`     | This documentation|
