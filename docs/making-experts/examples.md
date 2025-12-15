# Examples

Patterns for defining Experts. Each example highlights a specific skill type or integration approach.

- [GitHub Issue Bot](#github-issue-bot)
- [Web Search](#web-search)
- [Custom MCP Server](#custom-mcp-server)
- [Interactive Wizard](#interactive-wizard)
- [Application Integration](#application-integration)

## GitHub Issue Bot

**Pattern**: Use `requiredEnv` to pass environment variables to tools like `gh` CLI.

```toml
[experts."@perstack/github-issue-bot"]
description = "Answers GitHub issues by reading codebase"
instruction = """
You are a GitHub issue support bot.
Use `gh` CLI to fetch issue content, explore the codebase, and generate answers.
"""

[experts."@perstack/github-issue-bot".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
requiredEnv = ["GH_TOKEN", "GITHUB_REPO", "ISSUE_NUMBER"]
```

This Expert is published to the registry. Run it with:

```bash
npx perstack run @perstack/github-issue-bot "Answer issue #123"
```

See [examples/github-issue-bot](https://github.com/perstack-ai/perstack/tree/main/examples/github-issue-bot) for complete setup including GitHub Actions workflow and real-time activity logging.

## Web Search

**Pattern**: Use `mcpStdioSkill` with an npm package. Auto-installed at runtime.

```toml
[experts."market-monitor"]
description = "Monitors stock market changes and analyzes trends"
instruction = """
You are a market monitoring assistant.
Search for latest market news, compare with previous reports, and highlight changes.
"""

[experts."market-monitor".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
```

Uses [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server). Set `EXA_API_KEY` environment variable.

## Custom MCP Server

**Pattern**: Use `mcpStdioSkill` with your own MCP server for internal systems.

```toml
[experts."support-assistant"]
description = "Provides customer support using internal knowledge base"
instruction = """
You are a customer support assistant.
Look up customer info, search the knowledge base, and provide solutions.
"""

[experts."support-assistant".skills."customer-db"]
type = "mcpStdioSkill"
command = "node"
args = ["./mcp-servers/customer-db.js"]
requiredEnv = ["DB_CONNECTION_STRING"]

[experts."support-assistant".skills."knowledge-base"]
type = "mcpStdioSkill"
command = "node"
args = ["./mcp-servers/knowledge-base.js"]
```

Implement MCP servers in Node.js, Python, or any language. Keep credentials in environment variables.

## Interactive Wizard

**Pattern**: Use `interactiveSkill` to pause execution and wait for user input.

```toml
[experts."project-setup"]
description = "Guides users through project setup"
instruction = """
You are a setup wizard.
Use askChoice to ask about project type, framework, and tooling.
Generate config files based on selections.
"""

[experts."project-setup".skills."interaction"]
type = "interactiveSkill"

[experts."project-setup".skills."interaction".tools."askChoice"]
description = "Ask user to choose from options"
inputJsonSchema = """
{
  "type": "object",
  "properties": {
    "question": { "type": "string" },
    "options": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["question", "options"]
}
"""
```

When `askChoice` is called, execution pauses until the user responds.

## Application Integration

**Pattern**: Use `interactiveSkill` to let your application handle operations the Expert triggers.

```toml
[experts."shopping-concierge"]
description = "Helps find products and add to cart"
instruction = """
You are a shopping assistant.
Find matching products, then use addToCart to add them.
"""

[experts."shopping-concierge".skills."catalog"]
type = "mcpStdioSkill"
command = "node"
args = ["./mcp-servers/product-catalog.js"]

[experts."shopping-concierge".skills."app"]
type = "interactiveSkill"

[experts."shopping-concierge".skills."app".tools."addToCart"]
description = "Add product to cart"
inputJsonSchema = """
{
  "type": "object",
  "properties": {
    "productId": { "type": "string" },
    "quantity": { "type": "number" }
  },
  "required": ["productId", "quantity"]
}
"""
```

When `addToCart` is called, execution pauses and returns control to your application. Your app performs the cart operation, then resumes the Expert. This pattern separates AI reasoning from actual operations.
