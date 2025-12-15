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

```toml
model = "claude-sonnet-4-5"
temperature = 0.3

[provider]
providerName = "anthropic"

[experts."expert-name"]
version = "1.0.0"
description = "One-line description of what this Expert does"
instruction = """
Multi-line instruction defining the Expert's behavior.
"""

[experts."expert-name".skills."skill-name"]
type = "mcpStdioSkill"
command = "npx"
packageName = "package-name"
pick = ["tool1", "tool2"]
```

### Required Fields

| Field | Description |
| --- | --- |
| `version` | Semantic version (e.g., "1.0.0") |
| `description` | One-line summary for discovery |
| `instruction` | Detailed behavior instructions |

### Optional Fields

| Field | Description |
| --- | --- |
| `delegates` | Array of Expert keys this Expert can delegate to |
| `rules` | Additional rules for the Expert |

## Skill Configuration

### Built-in Base Skill

`@perstack/base` provides essential tools:

| Tool | Purpose |
| --- | --- |
| `readTextFile` | Read file contents |
| `writeTextFile` | Create/overwrite file |
| `editTextFile` | Edit existing file |
| `listDirectory` | List directory contents |
| `getFileInfo` | Get file metadata |
| `createDirectory` | Create directory |
| `exec` | Execute shell command |
| `think` | Explicit reasoning step |
| `todo` | Track progress |
| `attemptCompletion` | Complete the task |

### External MCP Skills

```toml
[experts."my-expert".skills."external-skill"]
type = "mcpStdioSkill"
command = "npx"
packageName = "package-name"
requiredEnv = ["API_KEY"]
pick = ["specific_tool"]
allowedDomains = ["api.example.com"]
```

| Field | Description |
| --- | --- |
| `requiredEnv` | Environment variables the skill needs |
| `pick` | Whitelist of tools to expose (recommended) |
| `omit` | Blacklist of tools to hide |
| `allowedDomains` | Required for `--runtime docker` |
| `rule` | Usage guidance for the LLM |

### SSE Skills (Remote)

```toml
[experts."my-expert".skills."remote-skill"]
type = "mcpSseSkill"
endpoint = "https://api.example.com/mcp"
```

## Delegation Patterns

### When to Use Delegation

Use delegation when:
- A task has distinct phases (search → analyze → compose)
- Different phases need different skills
- You want to isolate concerns

### Coordinator Pattern

```toml
[experts."coordinator"]
version = "1.0.0"
description = "Coordinates search and composition tasks"
instruction = """
You coordinate between specialized Experts.

Workflow:
1. Delegate to searcher to find information
2. Delegate to composer to create output
3. Present final result
"""
delegates = ["searcher", "composer"]

[experts."coordinator".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["think", "attemptCompletion"]

[experts."searcher"]
version = "1.0.0"
description = "Searches for relevant information"
instruction = """
You search for information and return structured results.
"""

[experts."searcher".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["listDirectory", "readTextFile", "think", "attemptCompletion"]

[experts."composer"]
version = "1.0.0"
description = "Composes output from gathered information"
instruction = """
You create well-formatted output from the information provided.
"""

[experts."composer".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["writeTextFile", "think", "attemptCompletion"]
```

## Instruction Writing

### Structure

```toml
instruction = """
You are a [role description].

## Context
[Background information the Expert needs]

## Workflow
[High-level steps, if complex]

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

### Interactive Testing

```bash
perstack start expert-name "test query"
```

### Headless Testing

```bash
perstack run expert-name "test query" 2>&1 | npx tsx filter.ts
```

Always test with `--runtime docker` before deployment:

```bash
perstack run expert-name "test query" --runtime docker 2>&1 | npx tsx filter.ts
```

### Test Scenarios

1. **Happy path** — Normal expected usage
2. **Edge cases** — Unusual but valid inputs
3. **Error cases** — Invalid inputs, missing data
4. **Delegation** — If using delegates, test the full flow

## Checklist

Before finalizing an Expert:

- [ ] `description` is concise and accurate
- [ ] `instruction` defines behavior declaratively
- [ ] Skills use `pick` to limit tools
- [ ] `allowedDomains` set for external APIs (for docker runtime)
- [ ] Tested with `perstack start`
- [ ] Tested with `--runtime docker`
- [ ] No hardcoded secrets or paths

## Examples

See working examples in the repository:

| Example | Pattern | Description |
| --- | --- | --- |
| `examples/gmail-assistant/` | Delegation | Email assistant with searcher, finder, composer |
| `examples/github-issue-bot/` | Single | Issue bot that reads codebase |

## Quick Reference

```toml
model = "claude-sonnet-4-5"
temperature = 0.3

[provider]
providerName = "anthropic"

[experts."my-expert"]
version = "1.0.0"
description = "Brief description"
instruction = """
You are a [role].

## Context
[Domain knowledge]

## Guidelines
[Rules and constraints]
"""

[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
pick = ["readTextFile", "writeTextFile", "think", "attemptCompletion"]
```
