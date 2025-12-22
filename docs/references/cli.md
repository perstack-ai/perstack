# CLI Reference

## Running Experts

### `perstack start`

Interactive workbench for developing and testing Experts.

```bash
perstack start [expertKey] [query] [options]
```

**Arguments:**
- `[expertKey]`: Expert key (optional — prompts if not provided)
- `[query]`: Input query (optional — prompts if not provided)

Opens a text-based UI for iterating on Expert definitions. See [Running Experts](../using-experts/running-experts.md).

### `perstack run`

Headless execution for production and automation.

```bash
perstack run <expertKey> <query> [options]
```

**Arguments:**
- `<expertKey>`: Expert key (required)
  - Examples: `my-expert`, `@org/my-expert`, `@org/my-expert@1.0.0`
- `<query>`: Input query (required)

Outputs JSON events to stdout.

## Shared Options

Both `start` and `run` accept the same options:

### Model and Provider

| Option                  | Description  | Default             |
| ----------------------- | ------------ | ------------------- |
| `--provider <provider>` | LLM provider | `anthropic`         |
| `--model <model>`       | Model name   | `claude-sonnet-4-5` |

Providers: `anthropic`, `google`, `openai`, `ollama`, `azure-openai`, `amazon-bedrock`, `google-vertex`

### Execution Control

| Option              | Description                                  | Default   |
| ------------------- | -------------------------------------------- | --------- |
| `--max-steps <n>`   | Maximum total steps across all Runs in a Job | unlimited |
| `--max-retries <n>` | Max retry attempts per generation            | `5`       |
| `--timeout <ms>`    | Timeout per generation (ms)                  | `60000`   |

### Runtime

| Option                | Description                            | Default                 |
| --------------------- | -------------------------------------- | ----------------------- |
| `--runtime <runtime>` | Execution runtime                      | From config or `docker` |
| `--workspace <path>`  | Workspace directory for Docker runtime | `./workspace`           |
| `--env <name...>`     | Env vars to pass to Docker runtime     | -                       |

Available runtimes:
- `docker` — Containerized runtime with network isolation (default)
- `local` — Built-in runtime without isolation
- `cursor` — Cursor CLI (experimental)
- `claude-code` — Claude Code CLI (experimental)
- `gemini` — Gemini CLI (experimental)

If `--runtime` is not specified, the runtime is determined by `runtime` field in `perstack.toml`. If neither is set, `docker` is used.

**Passing environment variables to Docker:**

Use `--env` to pass specific environment variables to the Docker container at runtime. This is useful for:
- Private npm packages: `--env NPM_TOKEN`
- Custom API keys needed by skills: `--env MY_API_KEY`

```bash
# Pass NPM_TOKEN for private npm packages
perstack run my-expert "query" --runtime docker --env NPM_TOKEN

# Pass multiple environment variables
perstack run my-expert "query" --env NPM_TOKEN --env MY_API_KEY
```

See [Multi-Runtime Support](../using-experts/multi-runtime.md) for setup and limitations.

### Configuration

| Option                 | Description             | Default                |
| ---------------------- | ----------------------- | ---------------------- |
| `--config <path>`      | Path to `perstack.toml` | Auto-discover from cwd |
| `--env-path <path...>` | Environment file paths  | `.env`, `.env.local`   |

### Job and Run Management

| Option                | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `--job-id <id>`       | Custom Job ID for new Job (default: auto-generated)         |
| `--continue`          | Continue latest Job with new Run                            |
| `--continue-job <id>` | Continue specific Job with new Run                          |
| `--resume-from <id>`  | Resume from specific checkpoint (requires `--continue-job`) |

**Combining options:**

```bash
# Continue latest Job from its latest checkpoint
--continue

# Continue specific Job from its latest checkpoint
--continue-job <jobId>

# Continue specific Job from a specific checkpoint
--continue-job <jobId> --resume-from <checkpointId>
```

**Note:** `--resume-from` requires `--continue-job` (Job ID must be specified). You can only resume from the Coordinator Expert's checkpoints.

### Interactive

| Option                               | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| `-i, --interactive-tool-call-result` | Treat query as interactive tool call result |

Use with `--continue` to respond to interactive tool calls from the Coordinator Expert.

### Other

| Option      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `--verbose` | Enable verbose logging (see [Verbose Mode](#verbose-mode)) |

## Verbose Mode

The `--verbose` flag enables detailed logging for debugging purposes. The behavior varies by runtime:

### Default Runtime (`perstack`)

Shows additional runtime information in the output.

### Docker Runtime (`--runtime docker`)

Enables comprehensive debugging output:

**Docker Build Progress:**
- Image layer pulling progress
- Build step execution
- Dependency installation status

**Container Lifecycle:**
- Container startup status
- Health check results
- Container exit information

**Proxy Monitoring (when network isolation is enabled):**
- Real-time allow/block events for network requests
- Domain and port information for each request
- Clear indication of blocked requests with reasons

**Example output in TUI:**
```
Docker Build [runtime] Building    Installing dependencies...
Docker Build [runtime] Complete    Docker build completed
Docker [proxy] Starting            Starting proxy container...
Docker [proxy] Healthy             Proxy container ready
Docker [runtime] Starting          Starting runtime container...
Docker [runtime] Running           Runtime container started
Proxy ✓ api.anthropic.com:443
Proxy ✗ blocked-domain.com:443     Domain not in allowlist
```

**Use cases:**
- Debugging network connectivity issues
- Verifying proxy allowlist configuration
- Monitoring which domains are being accessed
- Troubleshooting container startup failures

## Examples

```bash
# Basic execution (creates new Job)
npx perstack run my-expert "Review this code"

# With model options
npx perstack run my-expert "query" \
  --provider google \
  --model gemini-2.5-pro \
  --max-steps 100

# Continue Job with follow-up
npx perstack run my-expert "initial query"
npx perstack run my-expert "follow-up" --continue

# Continue specific Job from latest checkpoint
npx perstack run my-expert "continue" --continue-job job_abc123

# Continue specific Job from specific checkpoint
npx perstack run my-expert "retry with different approach" \
  --continue-job job_abc123 \
  --resume-from checkpoint_xyz

# Custom Job ID for new Job
npx perstack run my-expert "query" --job-id my-custom-job

# Respond to interactive tool call
npx perstack run my-expert "user response" --continue -i

# Custom config
npx perstack run my-expert "query" \
  --config ./configs/production.toml \
  --env-path .env.production

# Registry Experts
npx perstack run tic-tac-toe "Let's play!"
npx perstack run @org/expert@1.0.0 "query"

# Non-default runtimes
npx perstack run my-expert "query" --runtime local
npx perstack run my-expert "query" --runtime cursor
npx perstack run my-expert "query" --runtime claude-code
npx perstack run my-expert "query" --runtime gemini
```

## Registry Management

### `perstack publish`

Publish an Expert to the registry.

```bash
perstack publish [expertName] [options]
```

**Arguments:**
- `[expertName]`: Expert name from `perstack.toml` (prompts if not provided)

**Options:**
| Option            | Description                 |
| ----------------- | --------------------------- |
| `--config <path>` | Path to `perstack.toml`     |
| `--dry-run`       | Validate without publishing |

**Example:**
```bash
perstack publish my-expert
perstack publish my-expert --dry-run
```

Requires `PERSTACK_API_KEY` environment variable.

**Note:** Published Experts must use `npx` or `uvx` as skill commands. Arbitrary commands are not allowed for security reasons. See [Publishing](../making-experts/publishing.md#skill-requirements).

### `perstack unpublish`

Remove an Expert version from the registry.

```bash
perstack unpublish [expertKey] [options]
```

**Arguments:**
- `[expertKey]`: Expert key with version (e.g., `my-expert@1.0.0`)

**Options:**
| Option            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `--config <path>` | Path to `perstack.toml`                          |
| `--force`         | Skip confirmation (required for non-interactive) |

**Example:**
```bash
perstack unpublish                          # Interactive mode
perstack unpublish my-expert@1.0.0 --force  # Non-interactive
```

### `perstack tag`

Add or update tags on an Expert version.

```bash
perstack tag [expertKey] [tags...] [options]
```

**Arguments:**
- `[expertKey]`: Expert key with version (e.g., `my-expert@1.0.0`)
- `[tags...]`: Tags to set (e.g., `stable`, `beta`)

**Options:**
| Option            | Description             |
| ----------------- | ----------------------- |
| `--config <path>` | Path to `perstack.toml` |

**Example:**
```bash
perstack tag                              # Interactive mode
perstack tag my-expert@1.0.0 stable beta  # Set tags directly
```

### `perstack status`

Change the status of an Expert version.

```bash
perstack status [expertKey] [status] [options]
```

**Arguments:**
- `[expertKey]`: Expert key with version (e.g., `my-expert@1.0.0`)
- `[status]`: New status (`available`, `deprecated`, `disabled`)

**Options:**
| Option            | Description             |
| ----------------- | ----------------------- |
| `--config <path>` | Path to `perstack.toml` |

**Example:**
```bash
perstack status                           # Interactive mode
perstack status my-expert@1.0.0 deprecated
```

| Status       | Meaning                      |
| ------------ | ---------------------------- |
| `available`  | Normal, visible in registry  |
| `deprecated` | Still usable but discouraged |
| `disabled`   | Cannot be executed           |

## Debugging and Inspection

### `perstack log`

View execution history and events for debugging.

```bash
perstack log [options]
```

**Purpose:**

Inspect job/run execution history and events for debugging. This command is designed for both human inspection and AI agent usage, making it easy to diagnose issues in Expert runs.

**Default Behavior:**

When called without options, shows a summary of the latest job.

**Options:**

| Option                    | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `--job <jobId>`           | Show events for a specific job                         |
| `--run <runId>`           | Show events for a specific run                         |
| `--checkpoint <id>`       | Show checkpoint details                                |
| `--step <step>`           | Filter by step number (e.g., `5`, `>5`, `1-10`)        |
| `--type <type>`           | Filter by event type                                   |
| `--errors`                | Show only error-related events                         |
| `--tools`                 | Show only tool call events                             |
| `--delegations`           | Show only delegation events                            |
| `--filter <expression>`   | Simple filter expression                               |
| `--json`                  | Output as JSON (machine-readable)                      |
| `--pretty`                | Pretty-print JSON output                               |
| `--verbose`               | Show full event details                                |
| `--limit <n>`             | Limit number of results                                |
| `--context <n>`           | Include N events before/after matches                  |
| `--messages`              | Show message history for checkpoint                    |
| `--summary`               | Show summarized view                                   |
| `--config <path>`         | Path to `perstack.toml`                                |

**Event Types:**

| Event Type              | Description                              |
| ----------------------- | ---------------------------------------- |
| `startRun`              | Run started                              |
| `callTools`             | Tool calls made                          |
| `resolveToolResults`    | Tool results received                    |
| `callDelegate`          | Delegation to another expert             |
| `stopRunByError`        | Error occurred                           |
| `retry`                 | Generation retry                         |
| `completeRun`           | Run completed                            |
| `continueToNextStep`    | Step transition                          |

**Filter Expression Syntax:**

Simple conditions are supported:

```bash
# Exact match
--filter '.type == "completeRun"'

# Numeric comparison
--filter '.stepNumber > 5'
--filter '.stepNumber >= 5'
--filter '.stepNumber < 10'

# Array element matching
--filter '.toolCalls[].skillName == "base"'
```

**Step Range Syntax:**

```bash
--step 5       # Exact step number
--step ">5"    # Greater than 5
--step ">=5"   # Greater than or equal to 5
--step "1-10"  # Range (inclusive)
```

**Examples:**

```bash
# Show latest job summary
perstack log

# Show all events for a specific job
perstack log --job abc123

# Show events for a specific run
perstack log --run xyz789

# Show checkpoint details with messages
perstack log --checkpoint cp123 --messages

# Show only errors
perstack log --errors

# Show tool calls for steps 5-10
perstack log --tools --step "5-10"

# Filter by event type
perstack log --job abc123 --type callTools

# JSON output for automation
perstack log --job abc123 --json

# Error diagnosis with context
perstack log --errors --context 5

# Filter with expression
perstack log --filter '.toolCalls[].skillName == "base"'

# Summary view
perstack log --summary
```

**Output Format:**

Terminal output (default) shows human-readable format with colors:

```
Job: abc123 (completed)
Expert: my-expert@1.0.0
Started: 2024-12-23 10:30:15
Steps: 12

Events:
─────────────────────────────────────────────
[Step 1] startRun                    10:30:15
  Expert: my-expert@1.0.0
  Query: "Analyze this code..."

[Step 2] callTools                   10:30:18
  Tools: read_file, write_file

[Step 3] resolveToolResults          10:30:22
  ✓ read_file: Success
  ✗ write_file: Permission denied
─────────────────────────────────────────────
```

JSON output (`--json`) for machine parsing:

```json
{
  "job": { "id": "abc123", "status": "completed" },
  "events": [
    { "type": "startRun", "stepNumber": 1 }
  ],
  "summary": {
    "totalEvents": 15,
    "errorCount": 0
  }
}
```

## Performance Optimization

### `perstack install`

Pre-collect tool definitions to enable instant LLM inference.

```bash
perstack install [options]
```

**Purpose:**

By default, Perstack initializes MCP skills at runtime to discover their tool definitions. This can add 500ms-6s startup latency per skill. `perstack install` solves this by:

1. Initializing all skills once and collecting their tool schemas
2. Caching the schemas in a `perstack.lock` file
3. Enabling the runtime to start LLM inference immediately using cached schemas
4. Deferring actual MCP connections until tools are called

**Options:**

| Option                 | Description             | Default                |
| ---------------------- | ----------------------- | ---------------------- |
| `--config <path>`      | Path to `perstack.toml` | Auto-discover from cwd |
| `--env-path <path...>` | Environment file paths  | `.env`, `.env.local`   |

**Example:**

```bash
# Generate lockfile for current project
perstack install

# Generate lockfile for specific config
perstack install --config ./configs/production.toml

# Re-generate after adding new skills
perstack install
```

**Output:**

Creates `perstack.lock` in the same directory as `perstack.toml`. This file contains:

- All expert definitions (including resolved delegates from registry)
- All tool definitions for each expert's skills

**When to run:**

- After adding or modifying skills in `perstack.toml`
- After updating MCP server dependencies
- Before deploying to production for faster startup

**Note:** The lockfile is optional. If not present, skills are initialized at runtime as usual.

## Project Setup

### `npx create-expert`

Interactive wizard to create Perstack Experts.

```bash
npx create-expert                           # New project setup
npx create-expert my-expert "Add X"         # Improve existing Expert
```

**New Project Mode:**
- Detects available LLMs (Anthropic, OpenAI, Google)
- Detects available runtimes (Cursor, Claude Code, Gemini)
- Creates `.env`, `AGENTS.md`, `perstack.toml`
- Runs Expert creation flow

**Improvement Mode:**
When called with Expert name, skips setup and improves existing Expert.
