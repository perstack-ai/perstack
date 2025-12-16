# Rapid Prototyping

You have an idea for an AI agent. Maybe it's a customer support bot, a research assistant, or a code reviewer. You want to test whether the idea works — before investing in a full implementation.

**The problem**: Most agent frameworks require you to write code, set up infrastructure, and wire everything together. By the time you can test your idea, you've already invested significant effort.

**With Perstack**: Define your agent in a text file. Run it immediately. Iterate on the prompt until it works. No code required.

## From idea to running agent

Let's say you want to build a meeting summarizer that extracts action items from transcripts.

Create a file called `perstack.toml`:

```toml
[experts."meeting-summarizer"]
description = "Summarizes meeting transcripts and extracts action items"
instruction = """
You are a meeting analyst. When given a meeting transcript:
1. Identify the main topics discussed
2. Extract all action items with owners and deadlines
3. Note any decisions made
4. Flag any unresolved issues

Format output as markdown with clear sections.
"""
```

Run it:

```bash
npx perstack start meeting-summarizer "Here's the transcript from today's standup..."
```

That's it. Your agent is running. Watch how it responds, then adjust the instruction until it behaves the way you want.

> [!NOTE]
> Use `perstack start` during prototyping — the interactive UI shows you exactly what the agent is thinking and doing.

## Write prompts, not code

Your goal isn't to write code. It's to get a valuable agent running.

Every hour spent on boilerplate — setting up SDKs, configuring API clients, building orchestration logic — is an hour not spent on what actually matters: defining what your agent should do and testing whether it works.

Anthropic's research on building effective agents makes this clear: the most capable agents aren't the most complex ones. They're the ones that give the model exactly what it needs and stay out of the way. Complex orchestration frameworks and multi-step pipelines are often unnecessary — the model itself is increasingly capable when given clear instructions.

This is why Perstack uses plain text definitions:

| You focus on             | Perstack handles                 |
| ------------------------ | -------------------------------- |
| What the agent should do | Model access, tool orchestration |
| Domain knowledge         | State management, checkpoints    |
| Success criteria         | MCP server lifecycle             |

You write the instruction. The runtime does the rest. When you need more — tools, delegation, production deployment — you add it declaratively. No code changes, no infrastructure work.

The result: you spend your time on the hard problem (making the agent useful) instead of the solved problem (making it run).

## Make your agent better

Once your agent is running, the real work begins: making it good.

### Iterate fast

The power of this workflow is rapid iteration:

1. **Start minimal** — Write the smallest instruction that captures your intent
2. **Test with real input** — Use actual data, not toy examples
3. **Observe failures** — Watch where the agent gets confused
4. **Refine** — Add constraints or clarifications
5. **Repeat** — Until the agent handles your cases reliably

Each cycle takes seconds. Change the TOML, run again, observe results.

### Add tools with MCP Skills

Your agent can reason, but sometimes it needs to act — search the web, query a database, call an API.

```toml
[experts."researcher"]
description = "Researches topics using web search"
instruction = """
Search the web to find accurate, up-to-date information.
Always cite your sources.
"""

[experts."researcher".skills."web"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
requiredEnv = ["EXA_API_KEY"]
```

The runtime handles package resolution, server lifecycle, and tool registration. You just declare what you need.

See [Extending with Tools](./extending-with-tools.md) for more.

### Split responsibilities with delegation

When your instruction grows too long, split into multiple Experts:

```toml
[experts."support"]
description = "Routes customer inquiries to specialists"
instruction = "Understand what the customer needs, then delegate to the right specialist."
delegates = ["product-expert", "billing-expert"]

[experts."product-expert"]
description = "Answers product questions: specs, inventory, compatibility"
instruction = "Help customers find the right product."

[experts."billing-expert"]
description = "Handles billing: invoices, payments, subscriptions"
instruction = "Help with invoice questions and payment methods."
```

Each Expert stays focused. The coordinator decides who to call.

See [Taming Prompt Sprawl](./taming-prompt-sprawl.md) for the full pattern.

### Write effective instructions

How you write your instruction matters. Aim for the right level of specificity — not too rigid, not too vague.

See [Best Practices](../making-experts/best-practices.md) for guidelines on writing effective instructions, structuring your Experts, and common pitfalls to avoid.

## When your prototype grows

At some point, your prototype will need more:

- **External tools**: The agent needs to search the web, query a database, or call an API → See [Extending with Tools](./extending-with-tools.md)
- **Multiple responsibilities**: The prompt is getting long and the agent is getting confused → See [Taming Prompt Sprawl](./taming-prompt-sprawl.md)
- **Production deployment**: The prototype works and you want to ship it → See [Going to Production](./going-to-production.md)

The same TOML definition scales from prototype to production. You're not throwing away work — you're building on it.

## What's next

- [Making Experts](../making-experts/README.md) — Learn the full Expert definition format
- [Best Practices](../making-experts/best-practices.md) — Design patterns for effective Experts

