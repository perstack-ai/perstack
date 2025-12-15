# Creating Expert Guide

This guide defines how AI agents should create Experts for Perstack.

## Workflow

**You must complete all phases before reporting to the user.**

```
1. CREATE      → Define Expert in perstack.toml
2. DEBUG       → Run with filter, fix issues autonomously
3. VALIDATE    → Test multiple patterns
4. REPORT      → Present results to user
```

### Phase 1: Create

Follow this guide to define the Expert in `perstack.toml`.

### Phase 2: Debug

**Debug autonomously. Do not ask users for help.**

⚠️ Raw `perstack run` output contains massive JSON events. Always pipe through a filter script.

```bash
perstack run expert-name "test query" 2>&1 | npx tsx filter.ts
```

Create `filter.ts` if it doesn't exist. See [implementation.md](./implementation.md#autonomous-debugging) for the filter script template.

### Phase 3: Validate

Test multiple patterns to verify the Expert works correctly:

| Pattern    | Example Query                            |
| ---------- | ---------------------------------------- |
| Happy path | Normal expected usage                    |
| Edge case  | Unusual but valid input                  |
| Error case | Invalid input, missing data              |
| Delegation | Full flow with delegates (if applicable) |

### Phase 4: Report

**Report to user with:**

1. **Expert definition** — Show the `perstack.toml` content
2. **Test patterns tried** — List each pattern and query used
3. **Observed behavior** — What the Expert did for each pattern
4. **Issues found and fixed** — Any problems encountered during debugging

Example report format:

```markdown
## Expert Created: my-expert

### Definition
[perstack.toml content]

### Test Results
| Pattern    | Query                  | Behavior                              |
| ---------- | ---------------------- | ------------------------------------- |
| Happy path | "Find files with TODO" | Listed 3 files, showed line numbers   |
| Edge case  | "" (empty query)       | Asked for clarification               |
| Error case | "Read /etc/passwd"     | Correctly refused (outside workspace) |

### Issues Fixed
- Initial version missed `attemptCompletion` in pick list
```

## Security

Read [SECURITY.md](../SECURITY.md) for the security model.

**Key requirements:**
- Use `pick` to whitelist only needed tools (minimal privilege)
- Set `allowedDomains` for external API access (required for `--runtime docker`)
- Set `requiredEnv` to declare environment variables explicitly
- Never hardcode secrets in `instruction`

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

## Checklist

Before reporting to user:

- [ ] `description` is concise and accurate
- [ ] `instruction` defines behavior declaratively (not procedurally)
- [ ] Skills use `pick` to limit tools
- [ ] `allowedDomains` set for external APIs (for docker runtime)
- [ ] `requiredEnv` lists all needed environment variables
- [ ] No hardcoded secrets or paths
- [ ] Tested happy path
- [ ] Tested edge cases
- [ ] Debugged and fixed issues autonomously
- [ ] Report includes test patterns and observed behavior

## Examples

See [examples/](../examples/) for working Expert definitions.
