---
title: "Making Experts"
---

# Making Experts

Experts are defined in `perstack.toml`. This section covers how to define, test, and publish Experts.

## The essentials

Every Expert needs just two things:

```toml
[experts."code-reviewer"]
description = "Reviews code for issues and improvements"
instruction = """
You are a code reviewer. Analyze code for:
- Type safety and error handling
- Security vulnerabilities
- Performance issues
Provide actionable feedback with examples.
"""
```

- **description** — what it does (visible to delegators)
- **instruction** — how it thinks (private domain knowledge)

That's a complete, functional Expert. Skills and delegates are optional.

## Why TOML: Enabling domain experts

This is the core of agent-first development: **the people with domain knowledge should define the Experts**.

In most teams, a few "prompt-capable" engineers become bottlenecks. They're the only ones who can write and maintain agent prompts, while domain experts — who actually have the knowledge — can't contribute directly.

Perstack breaks this bottleneck. Expert definitions are plain text that anyone can read and write:

1. **No technical formatting knowledge required** — no indentation rules, no trailing commas, no escaping
2. **Comments for intent** — domain experts explain their reasoning inline

That's why we use TOML. The format serves the goal: domain experts own their Experts.

## Multiple Experts in one file

Define related Experts together:

```toml
[experts."researcher"]
description = "Gathers information from various sources"
instruction = "..."

[experts."writer"]
description = "Creates polished content from research"
instruction = "..."
delegates = ["researcher"]

[experts."editor"]
description = "Reviews and refines written content"
instruction = "..."
```

This pattern works well for:
- **Pipelines** — Experts that work in sequence
- **Teams** — Experts with complementary roles
- **Variants** — Similar Experts with different specializations

## Designing delegation

When one Expert delegates to another, only `description` is shared. The delegator never sees the delegate's `instruction`.

```
┌─────────────────────────────────────────────────────┐
│  writer                                             │
│  ├── sees: researcher.description                  │
│  └── decides: "I need research on X"               │
│                                                     │
│  researcher                                         │
│  ├── receives: "research on X"                     │
│  └── uses: own instruction (private)               │
└─────────────────────────────────────────────────────┘
```

This means:
- Write `description` for the delegator — what can I ask for? What will I get back?
- Write `instruction` for the Expert itself — domain knowledge, procedures, constraints

## In this section

- [Examples](./examples.md) — real-world use cases
- [Best Practices](./best-practices.md) — design guidelines for effective Experts
- [Skills](./skills.md) — adding MCP tools to your Experts
- [Base Skill](./base-skill.md) — built-in tools provided by the runtime
- [Testing](./testing.md) — strategies for testing Experts
- [Publishing](./publishing.md) — share Experts via the Registry
- [perstack.toml Reference](../references/perstack-toml.md) — complete field reference

## Prerequisites

Before making Experts, understand the core concepts:

- [Experts](../understanding-perstack/experts.md) — what Experts are and how they work
- [Getting Started](../getting-started.md) — build your first Expert

For running and integrating Experts, see [Using Experts](../using-experts/README.md).
