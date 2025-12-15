# CLI Reference for Coding Agents

## Running Experts

**`perstack start`** - Interactive workbench for developing and testing Experts

```bash
perstack start [expertKey] [query]
```

**`perstack run`** - Headless execution for production and automation

```bash
perstack run <expertKey> <query> [options]
```

## Creating Experts

**`npx create-expert`** - Interactive wizard to create and improve Experts

```bash
npx create-expert                    # New project
npx create-expert my-expert "Add X"  # Improve existing
```

## Common Options

| Option                  | Description           | Default             |
| ----------------------- | --------------------- | ------------------- |
| `--provider <provider>` | LLM provider          | `anthropic`         |
| `--model <model>`       | Model name            | `claude-sonnet-4-5` |
| `--temperature <temp>`  | Temperature (0.0-1.0) | `0.3`               |
| `--max-steps <n>`       | Maximum steps         | unlimited           |
| `--runtime <runtime>`   | Execution runtime     | `perstack`          |

## Available Runtimes

| Runtime       | Description                                   | Security               |
| ------------- | --------------------------------------------- | ---------------------- |
| `docker`      | **Recommended.** Containerized with isolation | Full sandbox + proxy   |
| `perstack`    | Built-in runtime (default)                    | No isolation           |
| `cursor`      | Cursor CLI (experimental)                     | Cursor's own security  |
| `claude-code` | Claude Code CLI (experimental)                | Claude Code's security |
| `gemini`      | Gemini CLI (experimental)                     | Gemini's security      |

⚠️ **Always use `--runtime docker`** for untrusted Experts. See [SECURITY.md](../SECURITY.md).

## perstack.toml Format

```toml
model = "claude-sonnet-4-5"
temperature = 0.3

[provider]
providerName = "anthropic"

[experts."my-expert"]
version = "1.0.0"
description = "Brief description"
instruction = """
Detailed instructions for the expert.
"""

[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
```

## Skills (MCP Servers)

Skills extend Experts with external capabilities via MCP (Model Context Protocol).

### MCP Registry

Search for MCP servers at: https://registry.modelcontextprotocol.io

### Using MCP Skills

**npm packages (most common):**

```toml
[experts."my-expert".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
pick = ["web_search_exa"]  # Optional: whitelist tools
allowedDomains = ["api.exa.ai"]  # Required for docker runtime
```

**Remote servers (SSE):**

```toml
[experts."my-expert".skills."remote-api"]
type = "mcpSseSkill"
endpoint = "https://api.example.com/mcp"
```

### Built-in Base Skill

`@perstack/base` provides essential tools:

- File operations: `readTextFile`, `writeTextFile`, `editTextFile`, etc.
- Shell execution: `exec`
- Control flow: `attemptCompletion`, `think`, `todo`

```toml
[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
```

## Best Practices for Creating Experts

### 1. Do One Thing Well

Bad:
```toml
[experts."assistant"]
description = "Handles inquiries, reports, meetings, and expenses"
```

Good:
```toml
[experts."customer-support"]
description = "Answers customer questions about products and orders"
```

### 2. Trust the LLM, Define Domain Knowledge

Bad (procedural):
```toml
instruction = """
1. First, greet the customer
2. Ask for their order number
3. Look up the order
"""
```

Good (declarative):
```toml
instruction = """
You are a customer support specialist.

Key policies:
- Orders ship within 2 business days
- Free returns within 30 days
- VIP customers get priority handling

Tone: Friendly but professional.
"""
```

### 3. Let Them Collaborate

Use delegation for complex workflows:

```toml
[experts."coordinator"]
delegates = ["researcher", "writer", "reviewer"]

[experts."researcher"]
description = "Gathers information from various sources"
```

### 4. Keep It Verifiable

Write clear, predictable instructions:

```toml
instruction = """
Approval rules:
- Under $100: Auto-approve with receipt
- $100-$500: Approve if business purpose is clear
- Over $500: Flag for manager review
"""
```

### 5. Ship Early

Start minimal, expand based on real usage. Don't over-engineer.

## Project Files

| File            | Purpose                               |
| --------------- | ------------------------------------- |
| `perstack.toml` | Expert definitions and runtime config |
| `.env`          | Environment variables (API keys)      |
| `perstack/`     | Execution history (auto-managed)      |
