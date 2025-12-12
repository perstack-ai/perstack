# perstack

The Command Line Interface (CLI) for Perstack. Run Experts interactively or in headless mode.

For full documentation, see [docs.perstack.ai](https://docs.perstack.ai).

## Installation

You can run `perstack` directly using `npx`:

```bash
npx perstack [command]
```

Or install it globally:

```bash
npm install -g perstack
```

## Usage

### `start`: Interactive Mode

Starts an interactive TUI session.

```bash
perstack start [expert] [query]
```

### `run`: Headless Mode

Executes an agent run and outputs JSON events to stdout.

```bash
perstack run <expert> <query>
```

### Shared Options

| Option                               | Description               | Default              |
| ------------------------------------ | ------------------------- | -------------------- |
| `--config <path>`                    | Path to `perstack.toml`   | Auto-discover        |
| `--provider <provider>`              | LLM provider              | `anthropic`          |
| `--model <model>`                    | Model name                | `claude-sonnet-4-5`  |
| `--temperature <temp>`               | Temperature (0.0-1.0)     | `0.3`                |
| `--max-steps <n>`                    | Maximum steps             | unlimited            |
| `--max-retries <n>`                  | Max retry attempts        | `5`                  |
| `--timeout <ms>`                     | Timeout per generation    | `60000`              |
| `--job-id <id>`                      | Custom job ID             | auto-generated       |
| `--run-id <id>`                      | Custom run ID             | auto-generated       |
| `--env-path <path...>`               | Environment file paths    | `.env`, `.env.local` |
| `--continue`                         | Continue latest job       | -                    |
| `--continue-job <id>`                | Continue specific job     | -                    |
| `--resume-from <id>`                 | Resume from checkpoint    | -                    |
| `-i, --interactive-tool-call-result` | Query is tool call result | -                    |
| `--verbose`                          | Enable verbose logging    | -                    |

---

### `publish`: Publish to Registry

Publish an Expert to the Perstack registry.

```bash
perstack publish [expertName]
```

**Options:**
- `--config <path>`: Path to `perstack.toml`.
- `--dry-run`: Validate without publishing.

---

### `unpublish`: Remove from Registry

Remove an Expert version from the registry.

```bash
perstack unpublish [expertKey]
```

**Options:**
- `--config <path>`: Path to `perstack.toml`.
- `--force`: Skip confirmation prompt.

---

### `tag`: Manage Tags

Add or update tags on an Expert version.

```bash
perstack tag [expertKey] [tags...]
```

---

### `status`: Change Status

Change the status of an Expert version (`available`, `deprecated`, `disabled`).

```bash
perstack status [expertKey] [status]
```

## Configuration

Perstack is configured via a `perstack.toml` file in your project root.

```toml
# perstack.toml
model = "claude-sonnet-4-5"

[provider]
providerName = "anthropic"

[experts."researcher"]
description = "Researches topics using web search"
instruction = "You are an expert researcher..."

[experts."researcher".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
```

### Environment Variables

Secrets like API keys should be stored in a `.env` file:

```bash
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
PERSTACK_API_KEY=...
```

## Development

This package is part of the Perstack monorepo. To build and run locally:

```bash
pnpm install
pnpm build
node dist/bin/cli.js start
```