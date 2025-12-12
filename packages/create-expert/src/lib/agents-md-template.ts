import type { LLMProvider, RuntimeType } from "@perstack/tui"

interface AgentsMdOptions {
  provider: LLMProvider
  model: string
  runtime?: RuntimeType | "default"
}

export function generateAgentsMd(options: AgentsMdOptions): string {
  const { provider, model, runtime } = options
  const isNonDefaultRuntime = runtime && runtime !== "default"
  const runtimeSection = isNonDefaultRuntime ? `runtime = "${runtime}"` : ""
  return `# AGENTS.md

## What is Perstack

Perstack is a package manager and runtime for agent-first development. It enables you to define, test, and share modular AI agents called "Experts".

Key concepts:
- **Experts**: Modular micro-agents defined in TOML
- **Runtime**: Executes Experts with isolation, observability, and sandbox support
- **Registry**: Public registry for sharing and reusing Experts

## Project Configuration

This project uses:
- Provider: ${provider}
- Model: ${model}
${isNonDefaultRuntime ? `- Runtime: ${runtime}` : "- Runtime: perstack (built-in)"}

## CLI Reference

### Running Experts

**\`perstack start\`** - Interactive workbench for developing and testing Experts
\`\`\`bash
perstack start [expertKey] [query]
\`\`\`

**\`perstack run\`** - Headless execution for production and automation
\`\`\`bash
perstack run <expertKey> <query> [options]
\`\`\`

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| \`--provider <provider>\` | LLM provider | \`anthropic\` |
| \`--model <model>\` | Model name | \`claude-sonnet-4-5\` |
| \`--temperature <temp>\` | Temperature (0.0-1.0) | \`0.3\` |
| \`--max-steps <n>\` | Maximum steps | unlimited |
| \`--runtime <runtime>\` | Execution runtime | \`perstack\` |

### Available Runtimes

- \`perstack\` — Built-in runtime (default)
- \`cursor\` — Cursor CLI (experimental)
- \`claude-code\` — Claude Code CLI (experimental)
- \`gemini\` — Gemini CLI (experimental)

## perstack.toml Format

\`\`\`toml
model = "${model}"
temperature = 0.3

[provider]
providerName = "${provider}"

[experts."my-expert"]
version = "1.0.0"
description = "Brief description"
instruction = """
Detailed instructions for the expert.
"""
${runtimeSection}

[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
\`\`\`

## Best Practices for Creating Experts

### 1. Do One Thing Well

Bad:
\`\`\`toml
[experts."assistant"]
description = "Handles inquiries, reports, meetings, and expenses"
\`\`\`

Good:
\`\`\`toml
[experts."customer-support"]
description = "Answers customer questions about products and orders"
\`\`\`

### 2. Trust the LLM, Define Domain Knowledge

Bad (procedural):
\`\`\`toml
instruction = """
1. First, greet the customer
2. Ask for their order number
3. Look up the order
"""
\`\`\`

Good (declarative):
\`\`\`toml
instruction = """
You are a customer support specialist.

Key policies:
- Orders ship within 2 business days
- Free returns within 30 days
- VIP customers get priority handling

Tone: Friendly but professional.
"""
\`\`\`

### 3. Let Them Collaborate

Use delegation for complex workflows:
\`\`\`toml
[experts."coordinator"]
delegates = ["researcher", "writer", "reviewer"]

[experts."researcher"]
description = "Gathers information from various sources"
\`\`\`

### 4. Keep It Verifiable

Write clear, predictable instructions:
\`\`\`toml
instruction = """
Approval rules:
- Under $100: Auto-approve with receipt
- $100-$500: Approve if business purpose is clear
- Over $500: Flag for manager review
"""
\`\`\`

### 5. Ship Early

Start minimal, expand based on real usage. Don't over-engineer.

## Finding Skills (MCP Servers)

Skills extend Experts with external capabilities via MCP (Model Context Protocol).

### MCP Registry

Search for MCP servers at: https://registry.modelcontextprotocol.io

**API Reference:**
\`\`\`bash
# List all servers
curl "https://registry.modelcontextprotocol.io/v0.1/servers"

# Search by name
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=filesystem"

# Get specific server
curl "https://registry.modelcontextprotocol.io/v0.1/servers/{serverName}/versions/{version}"
\`\`\`

### Using MCP Skills

**npm packages (most common):**
\`\`\`toml
[experts."my-expert".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
pick = ["web_search_exa"]  # Optional: whitelist tools
\`\`\`

**Remote servers (SSE):**
\`\`\`toml
[experts."my-expert".skills."remote-api"]
type = "mcpSseSkill"
endpoint = "https://api.example.com/mcp"
\`\`\`

### Built-in Base Skill

\`@perstack/base\` provides essential tools:
- File operations: \`readTextFile\`, \`writeTextFile\`, \`editTextFile\`, etc.
- Shell execution: \`exec\`
- Control flow: \`attemptCompletion\`, \`think\`, \`todo\`

\`\`\`toml
[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
\`\`\`

## Testing Experts

1. Start with \`perstack start\` for interactive development
2. Test happy path scenarios first
3. Test edge cases and error scenarios
4. Verify outputs match expectations
5. Use \`--max-steps\` to limit runaway executions

## Project Files

- \`perstack.toml\` - Expert definitions and runtime config
- \`AGENTS.md\` - This file, for AI agent context
- \`.env\` - Environment variables (API keys)
- \`perstack/\` - Execution history (auto-managed)
`
}
