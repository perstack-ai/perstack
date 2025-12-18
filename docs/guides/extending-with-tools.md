---
title: "Extending with Tools"
description: "Give your agent access to web search, databases, and APIs using MCP skills. Declare tools in TOML, the runtime handles the rest."
tags: ["tools", "mcp", "skills"]
order: 3
---

# Extending with Tools

Your agent can reason and generate text. But sometimes that's not enough — you need it to search the web, query a database, or call an API.

**The problem**: Integrating external tools usually means writing code, managing connections, and handling errors. Each new tool is a custom integration.

**With Perstack**: Declare the tool in TOML. The runtime handles the rest.

## MCP: The tool protocol

Perstack uses [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) for tools. MCP is a standard way for AI applications to connect to external capabilities.

Why this matters for you:

- **Growing ecosystem**: Hundreds of MCP servers already exist for common services
- **No custom code**: Just declare the server, Perstack runs it
- **Consistent interface**: All tools work the same way

## Adding a web search

Let's give your agent the ability to search the web using [Exa](https://exa.ai/):

```toml
[experts."researcher"]
description = "Researches topics using web search"
instruction = """
You are a research assistant.
Search the web to find accurate, up-to-date information.
Always cite your sources.
"""

[experts."researcher".skills."web"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
```

```bash
export EXA_API_KEY=your_key_here
npx perstack start researcher "What are the latest developments in quantum computing?"
```

The agent can now search the web. You didn't write any integration code.

## How it works

When you run the Expert:

1. **Package resolution**: Perstack sees `exa-mcp-server` and ensures it's available
2. **Server start**: The MCP server spawns as a subprocess
3. **Tool discovery**: The server advertises its tools (e.g., `search`, `findSimilar`)
4. **Agent access**: Those tools appear to the agent as callable functions
5. **Lifecycle management**: Server shuts down when the Expert finishes

> [!NOTE]
> Only environment variables listed in `requiredEnv` are passed to the MCP server. Your other secrets stay private.

## Connecting to your own systems

For internal tools, point to your own MCP server:

```toml
[experts."support-agent".skills."internal"]
type = "mcpStdioSkill"
command = "node"
args = ["./mcp-servers/customer-db.js"]
requiredEnv = ["DB_CONNECTION_STRING"]
```

Or connect to a remote server:

```toml
[experts."analyst".skills."warehouse"]
type = "mcpSseSkill"
endpoint = "https://internal.company.com/mcp/warehouse"
```

## Controlling tool access

Not all tools should be available to all agents. Use `pick` and `omit`:

```toml
[experts."reader".skills."filesystem"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@modelcontextprotocol/server-filesystem"
pick = ["read_file", "list_directory"]
# Agent can read files but not write or delete
```

```toml
[experts."editor".skills."filesystem"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@modelcontextprotocol/server-filesystem"
omit = ["delete_file"]
# Agent can read and write but not delete
```

This is minimal privilege — agents only get the capabilities they need.

## Adding usage guidance

Sometimes you want to guide *how* the agent uses a tool:

```toml
[experts."researcher".skills."web"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
rule = "Prefer .edu and .gov sources. Verify information from multiple sources before citing."
```

The `rule` field adds instructions specific to this skill.

## Multiple tools, one agent

Agents can have multiple skills:

```toml
[experts."analyst"]
description = "Analyzes data from multiple sources"
instruction = """
You are a data analyst.
Search the web for context, query the database for numbers,
and produce insights that combine both.
"""

[experts."analyst".skills."web"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]

[experts."analyst".skills."database"]
type = "mcpStdioSkill"
command = "node"
args = ["./mcp-servers/analytics-db.js"]
requiredEnv = ["ANALYTICS_DB_URL"]
```

## What's next

- [Skills](../making-experts/skills.md) — Complete skill reference
- [Base Skill](../making-experts/base-skill.md) — Built-in tools available to all Experts
- [Examples](../making-experts/examples.md) — More tool integration patterns
