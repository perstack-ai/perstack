# Debugging Guide

This guide explains how to debug Perstack executions effectively using the `perstack log` command.

## When to Use

- When a Perstack run fails or produces unexpected results
- When investigating tool call behavior
- When tracing delegation chains between experts
- When analyzing token usage and step counts

## Quick Start

```bash
# View latest job (human-readable)
perstack log

# View latest job as JSON (machine-readable)
perstack log --json

# View specific job
perstack log --job <jobId>
```

**Default Behavior:**
- Shows the latest job (indicated by "(showing latest job)")
- Displays storage path (e.g., "Storage: /path/to/perstack")
- Limits to 100 events by default (use `--take 0` for all)

## Common Debugging Scenarios

### 1. Investigating Errors

When a run fails, start by filtering for error events:

```bash
# Show only error-related events
perstack log --errors

# Show errors with context (events before/after)
perstack log --errors --context 3

# Get full details in JSON for parsing
perstack log --errors --json --pretty
```

### 2. Tracing Tool Calls

To understand what tools were called and their results:

```bash
# Show only tool call events
perstack log --tools --verbose

# Filter by specific step
perstack log --tools --step 5

# Show tool calls in a step range
perstack log --tools --step 1-10
```

### 3. Analyzing Delegations

When multiple experts are involved:

```bash
# Show delegation events
perstack log --delegations

# Combine with verbose for full details
perstack log --delegations --verbose --json --pretty
```

### 4. Checkpoint Analysis

To examine conversation history and state:

```bash
# Show checkpoint with message history
perstack log --checkpoint <checkpointId> --messages

# View all checkpoints for a run
perstack log --run <runId> --type continueToNextStep --verbose
```

### 5. Custom Filtering

Use filter expressions for precise queries:

```bash
# Filter by event type
perstack log --filter '.type == "callTools"'

# Filter by expert
perstack log --filter '.expertKey == "my-expert@1.0.0"'

# Filter by step number
perstack log --step ">5"
```

## Output Formats

### Human-Readable (Default)

Best for quick inspection:

```bash
perstack log --summary
```

### JSON (Machine-Readable)

Best for scripting and AI agent consumption:

```bash
# Compact JSON
perstack log --json

# Pretty-printed JSON
perstack log --json --pretty
```

## AI Agent Usage

When debugging as an AI agent, use JSON output for structured parsing:

```bash
# Get structured error information
perstack log --errors --json --pretty

# Parse and analyze tool results
perstack log --tools --json | jq '.events[] | select(.type == "resolveToolResults")'

# Get summary statistics
perstack log --summary --json
```

## Environment Variables

- `PERSTACK_STORAGE_PATH`: Override the storage location (default: `./perstack`)

## Common Event Types

| Event Type           | Description                  |
| -------------------- | ---------------------------- |
| `startRun`           | Run started                  |
| `callTools`          | Tool calls made              |
| `resolveToolResults` | Tool results received        |
| `callDelegate`       | Delegation to another expert |
| `stopRunByError`     | Error occurred               |
| `retry`              | Generation retry             |
| `completeRun`        | Run completed                |
| `continueToNextStep` | Step transition              |

## Pagination

By default, only 100 events are shown. Use `--take` and `--offset` for pagination:

```bash
# Show first 50 events
perstack log --take 50

# Skip first 100, show next 100
perstack log --offset 100

# Show events 101-150
perstack log --take 50 --offset 100

# Show all events (no limit)
perstack log --take 0
```

## Tips

1. **Start broad, then narrow**: Begin with `perstack log` to see all events, then add filters
2. **Use `--context`**: When filtering, add context to see surrounding events
3. **JSON for scripts**: Always use `--json` when parsing output programmatically
4. **Check steps**: Use `--step` to focus on specific phases of execution
5. **Combine filters**: Multiple options are ANDed together for precise filtering
6. **Paginate large jobs**: Use `--take` and `--offset` for jobs with many events
