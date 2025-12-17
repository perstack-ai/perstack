---
title: "Taming Prompt Sprawl"
description: "Fix bloated prompts and confused behavior. Split responsibilities with delegation."
tags: ["architecture", "best-practices"]
order: 2
---

# Taming Prompt Sprawl

Your agent started simple. A focused prompt, clear behavior, reliable results.

Then requirements grew. You added more capabilities, more edge cases, more instructions. Now your prompt is 50,000 tokens long — a small novel — and the agent gets confused between tasks. You're afraid to change anything because you might break something else.

**This is prompt sprawl** — and it's one of the most common problems in agent development.

## The symptoms

You might have prompt sprawl if:

- Your system prompt is hundreds of lines long
- The agent sometimes "forgets" instructions that are clearly there
- Adding new capabilities breaks existing behavior
- Different parts of the prompt contradict each other
- Only you (the original author) can maintain it

## Why it happens

LLMs have finite context windows and attention. Research on context engineering has revealed a phenomenon called **context rot**: as the number of tokens increases, the model's ability to accurately recall information decreases.

This isn't a bug — it's architectural. Transformers create n² pairwise relationships for n tokens. As context grows, the model's ability to capture these relationships gets stretched thin. There's a natural tension between context size and attention focus.

When you pack too much into a single prompt:

- **Attention dilutes**: The model has an "attention budget" that gets depleted with each token. A 50k-token prompt competes with itself for the model's focus.
- **Instructions conflict**: Rule A says "be concise", Rule B says "explain thoroughly". The model can't satisfy both.
- **Signal drowns in noise**: By the time the model processes all your edge cases, it's lost track of the user's actual request.

The solution isn't a bigger context window. Even with larger windows, the fundamental tradeoff remains: more tokens mean less attention per token.

## Migrate your bloated agent

You've got a monolithic agent built with some framework. The prompt is a mess. You can't maintain it. Here's how to fix it with Perstack — without starting over.

### Step 1: Extract your prompt

Your current agent probably looks something like this (pseudocode):

```python
# Your current mess
agent = SomeFramework(
    system_prompt="""
    You are a customer service agent. Handle:
    - Product questions (check inventory, specs, compatibility...)
    - Order issues (tracking, returns, refunds...)
    - Technical support (troubleshooting, setup guides...)
    - Billing inquiries (invoices, payment methods...)
    
    For product questions, always check the database first...
    For returns, verify the order date and apply policy X...
    [... 500 more lines ...]
    """,
    tools=[search_tool, db_tool, ...],
)
```

Take that giant system prompt. You'll split it into focused pieces.

### Step 2: Identify clusters

Look at your prompt. Which instructions naturally group together?

In the customer service example:
- Product questions → one cluster
- Order issues → another cluster
- Technical support → another cluster
- Billing → another cluster

Each cluster becomes its own Expert.

### Step 3: Create focused Experts

```toml
# perstack.toml

[experts."product-expert"]
description = "Answers product questions: specs, inventory, compatibility"
instruction = """
You are a product specialist.
Help customers find the right product and answer technical specifications.
Check inventory before making promises.
"""

[experts."order-expert"]
description = "Handles order issues: tracking, returns, refunds"
instruction = """
You are an order specialist.
Help with tracking, returns, and refunds.
Always verify order details before processing changes.
"""

[experts."tech-support"]
description = "Provides technical support and troubleshooting"
instruction = """
You are a technical support specialist.
Guide users through troubleshooting steps.
Escalate to engineering if standard procedures don't resolve the issue.
"""

[experts."billing-expert"]
description = "Handles billing: invoices, payments, subscriptions"
instruction = """
You are a billing specialist.
Help with invoice questions, payment methods, and subscription changes.
Never share full payment details in responses.
"""
```

Notice: each Expert's instruction is 5-10 lines, not 500. The model can actually follow all of it.

### Step 4: Add a coordinator

```toml
[experts."customer-service"]
description = "Routes customer inquiries to specialists"
instruction = """
You are a customer service coordinator.
Understand what the customer needs, then delegate to the right specialist.
"""
delegates = ["product-expert", "order-expert", "tech-support", "billing-expert"]
```

The coordinator doesn't do the work — it routes to the right specialist. Its prompt stays minimal.

### Step 5: Migrate incrementally

You don't have to migrate everything at once.

1. Extract the clearest cluster first (e.g., billing)
2. Test it in isolation: `npx perstack start billing-expert "I need help with my invoice"`
3. Add it as a delegate to your main Expert
4. Verify behavior is preserved
5. Repeat for the next cluster

Each step is small and testable. You're refactoring, not rewriting.

> [!NOTE]
> Your existing tools (database access, APIs, etc.) become MCP skills. See [Extending with Tools](./extending-with-tools.md).

## Why this works

This isn't just a Perstack pattern — it's backed by research on how to build effective agents.

### Context isolation solves the attention problem

Anthropic's research on context engineering recommends **sub-agent architectures** as a key technique for long-horizon tasks. Rather than one agent attempting to maintain state across an entire project, specialized sub-agents handle focused tasks with clean context windows.

Each sub-agent might explore extensively — using tens of thousands of tokens — but returns only a condensed summary. The detailed context remains isolated within sub-agents, while the lead agent focuses on synthesizing results.

### Multi-agent outperforms single-agent on complex tasks

Anthropic built a multi-agent research system and found it **substantially outperformed single-agent systems** on complex research tasks. The architecture: a lead agent coordinates while specialized sub-agents perform deep technical work.

The lesson: when a task requires multiple areas of expertise, splitting into specialized agents produces better results than a generalist trying to do everything.

### Each Expert gets full attention

With 50-100 lines of instruction instead of 500+, each Expert operates within its attention budget. The model can actually follow all your instructions — because there aren't that many to follow.

## How delegation works

When you define `delegates`, Perstack presents them as callable tools:

```
customer-service sees:
├── product-expert (tool) — "Answers product questions: specs, inventory..."
├── order-expert (tool) — "Handles order issues: tracking, returns..."
├── tech-support (tool) — "Provides technical support..."
└── billing-expert (tool) — "Handles billing: invoices, payments..."
```

The coordinator reads the customer's message, decides which specialist to call, and writes a query for them. The specialist executes independently — with its own fresh context — and returns a result.

> [!NOTE]
> Delegates only see each other's `description`, never the `instruction`. This enforces clean interfaces between Experts and prevents context leakage.

## Signs you've split correctly

- Each Expert's instruction fits in ~100 lines
- You can describe what each Expert does in one sentence
- Experts don't need to know about each other's internal logic
- You can test each Expert independently

## What's next

- [Experts](../understanding-perstack/experts.md) — How delegation works in detail
- [Best Practices](../making-experts/best-practices.md) — Design patterns for splitting Experts
- [Adding AI to Your App](./adding-ai-to-your-app.md) — Integrate your modular agents
