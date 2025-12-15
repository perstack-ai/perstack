# Creating Expert Guide

This guide defines how AI agents should create Experts for Perstack.

## Core Principles

Read [Best Practices](../docs/content/making-experts/best-practices.mdx) for the five principles:

1. **Do One Thing Well** — Single, focused responsibility
2. **Trust the LLM, Define Domain Knowledge** — Declarative, not procedural
3. **Let Them Collaborate** — Modular Experts with delegation
4. **Keep It Verifiable** — Predictable behavior anyone can audit
5. **Ship Early** — Start minimal, expand based on real usage

## perstack.toml Structure

See [perstack.toml Reference](../docs/content/references/perstack-toml.mdx) for complete field documentation.

### Minimal Example

```toml
[experts."my-expert"]
version = "1.0.0"
description = "One-line description"
instruction = """
You are a [role].

[Domain knowledge and guidelines]
"""

[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["readTextFile", "writeTextFile", "think", "attemptCompletion"]
```

### Required Fields

| Field         | Description                      |
| ------------- | -------------------------------- |
| `version`     | Semantic version (e.g., "1.0.0") |
| `description` | One-line summary for discovery   |
| `instruction` | Detailed behavior instructions   |

## Skill Configuration

See [Skills](../docs/content/making-experts/skills.mdx) for MCP skill types and configuration.

See [Base Skill](../docs/content/making-experts/base-skill.mdx) for built-in tool reference.

**Key principle:** Use `pick` to whitelist only the tools the Expert needs.

```toml
[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["readTextFile", "writeTextFile", "think", "attemptCompletion"]
```

## Delegation

See [Making Experts](../docs/content/making-experts/index.mdx) for delegation design patterns.

**Key insight:** Delegators only see `description`, never `instruction`. Write `description` for the delegator, `instruction` for the Expert itself.

```toml
[experts."coordinator"]
delegates = ["searcher", "composer"]

[experts."searcher"]
description = "Searches for relevant information"

[experts."composer"]
description = "Composes output from gathered information"
```

## Instruction Writing

### Structure

```toml
instruction = """
You are a [role description].

## Context
[Background information the Expert needs]

## Guidelines
[Dos and don'ts]

## Output Format
[Expected output structure]
"""
```

### Tips

- Be specific about the role
- Include domain knowledge (policies, rules, constraints)
- Define output format explicitly
- Avoid step-by-step procedural instructions
- Trust the LLM to figure out implementation details

## Testing

See [Testing Experts](../docs/content/making-experts/testing.mdx) for detailed testing strategies.

```bash
perstack start expert-name "test query"
perstack run expert-name "test query" --runtime docker 2>&1 | npx tsx filter.ts
```

Test scenarios:
1. **Happy path** — Normal expected usage
2. **Edge cases** — Unusual but valid inputs
3. **Delegation** — If using delegates, test the full flow

## Checklist

Before finalizing an Expert:

- [ ] `description` is concise and accurate
- [ ] `instruction` defines behavior declaratively (not procedurally)
- [ ] Skills use `pick` to limit tools
- [ ] `allowedDomains` set for external APIs (for docker runtime)
- [ ] Tested with `perstack start`
- [ ] Tested with `--runtime docker`
- [ ] No hardcoded secrets or paths

## Examples

See working examples in the repository:

| Example                      | Pattern    | Description                                     |
| ---------------------------- | ---------- | ----------------------------------------------- |
| `examples/gmail-assistant/`  | Delegation | Email assistant with searcher, finder, composer |
| `examples/github-issue-bot/` | Single     | Issue bot that reads codebase                   |
