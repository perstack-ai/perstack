# Getting Started

Ever tried to reuse an agent you built 3 months ago? You probably couldn't.

Perstack fixes this. Define Experts once, reuse them everywhere — like npm packages for agents.

## Prerequisites

- Node.js 22+
- LLM provider API key (Anthropic, OpenAI, Google, etc.)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

See [Providers and Models](./references/providers-and-models.md) for other providers.

## Try It

```bash
npx perstack start tic-tac-toe "Let's play!"
```

`perstack start` starts an interactive session with the Expert.
The runtime fetches the Expert from Registry and runs it with the given query.

## Quick Setup

The fastest way to get started:

```bash
npx create-expert
```

This interactive wizard:
- Detects available LLMs and runtimes
- Configures your environment
- Creates `perstack.toml` and `AGENTS.md`
- Helps you build your first Expert

## Build Your Own (Manual Setup)

Here's where it gets interesting. Let's build a fitness assistant that delegates to a professional trainer.

**Traditional approach:** One monolithic agent with a bloated prompt trying to do everything.

**Perstack approach:** Two focused Experts, each doing one thing well.

```toml
# ./perstack.toml

[experts."fitness-assistant"]
description = "Assists users with their fitness journey"

instruction = """
As a personal fitness assistant:
1. Conduct interview sessions with the user
2. Manage records in `./fitness-log.md`
3. Delegate to `pro-trainer` for professional training menus
"""

delegates = ["pro-trainer"]

[experts."pro-trainer"]
description = """
Suggests training menus based on user history and current physical condition.
"""

instruction = """
Provide training menu suggestions with scientifically verified effects.
Tailor recommendations to the user's condition and training history.
"""
```

Run it:

```bash
npx perstack start fitness-assistant "Start today's session"
```

What just happened:

| Aspect            | What Perstack Does                                                               |
| ----------------- | -------------------------------------------------------------------------------- |
| **Isolation**     | Each Expert has its own context window. No prompt bloat.                         |
| **Collaboration** | `fitness-assistant` delegates to `pro-trainer` autonomously.                     |
| **State**         | Both Experts share the workspace (`./fitness-log.md`), not conversation history. |
| **Reusability**   | `pro-trainer` can be reused in other projects as-is.                             |

The benefit of separating concerns:

- **Role clarity** — `fitness-assistant` handles interaction and records; `pro-trainer` focuses on training menus
- **Automatic context** — `fitness-assistant` passes relevant history to `pro-trainer` so users don't repeat themselves
- **Better output** — specialists collaborate to produce accurate, personalized suggestions

> [!NOTE]
> By default, Perstack searches for `perstack.toml` from the current directory upward.
> Use `--config <path>` to specify a custom location.

## Add MCP Skills

Experts can use external tools through MCP (Model Context Protocol).

Here's an example using [exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) for web search:

```toml
[experts."news-researcher"]
description = "Researches latest news on a topic"

instruction = """
1. Search the web for recent news on the given topic
2. Summarize findings with source URLs
3. Save report to `./reports/news.md`
"""

[experts."news-researcher".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
```

```bash
export EXA_API_KEY=your_exa_key
npx perstack start news-researcher "AI startup funding this week"
```

You just declare what you need — the runtime handles the rest:

- **Package resolution**: `exa-mcp-server` is fetched and spawned automatically
- **Lifecycle management**: MCP servers start with the Expert, shut down when done
- **Environment isolation**: Only `requiredEnv` variables are passed to the MCP server
- **Error recovery**: MCP failures are fed back to the LLM, not thrown as runtime errors

For more on skills, see [Skills](./making-experts/skills.md).

## Run in Production

For production, run Experts in isolated containers:

```Dockerfile
FROM node:22-slim
RUN npm install -g perstack
COPY perstack.toml /app/perstack.toml
WORKDIR /workspace
ENTRYPOINT ["perstack", "start", "--config", "/app/perstack.toml", "fitness-assistant"]
```

```bash
docker build -t fitness-assistant .
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  fitness-assistant "Start today's session"
```

This pattern maps one container to one Expert:
- `ENTRYPOINT` fixes the Expert — callers just pass the query
- Workspace is volume-mounted, so `--continue` works across container restarts
- Mount per-user workspaces for personalization (e.g., `-v /data/users/alice:/workspace`)
- Container image becomes a deployable, versioned artifact

Perstack is sandbox-first by design:
- Agents have larger attack surfaces than typical apps — sandbox the environment, not the agent's capabilities
- JSON events to stdout by default — no direct external messaging from within the sandbox
- Embed the runtime with custom event listeners for programmatic control

See [Sandbox Integration](./understanding-perstack/sandbox-integration.md) for the full rationale.

## What's Next

You've seen the basics. Here's where to go from here:

**Do something specific:**
- [Rapid Prototyping](./working-with-perstack/rapid-prototyping.md) — validate ideas without writing code
- [Taming Prompt Sprawl](./working-with-perstack/taming-prompt-sprawl.md) — fix bloated prompts with modular Experts
- [Adding AI to Your App](./working-with-perstack/adding-ai-to-your-app.md) — integrate Experts into existing applications
- [Going to Production](./working-with-perstack/going-to-production.md) — deploy safely with Docker isolation

**Understand the architecture:**
- [Concept](./understanding-perstack/concept.md) — why isolation and observability matter
- [Experts](./understanding-perstack/experts.md) — best practices for Expert design

**Build more:**
- [Making Experts](./making-experts/README.md) — full `perstack.toml` guide
- [Skills](./making-experts/skills.md) — MCP integration patterns

**Reference:**
- [CLI Reference](./references/cli.md) — all commands and options
- [perstack.toml Reference](./references/perstack-toml.md) — complete configuration spec
