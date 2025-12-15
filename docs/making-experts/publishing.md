# Publishing Experts

Share your Experts with the community by publishing them to the Perstack Registry.

## Before publishing

Ensure your Expert is ready:

1. **Clear description** — tells other Experts (and humans) what this Expert does and how to use it
2. **Tested locally** — run it with various queries to verify behavior
3. **Minimal skills** — only include skills the Expert actually needs
4. **Version-ready** — follow [SemVer](https://semver.org) for versioning

## Skill requirements

Published Experts have restrictions on MCP skills for security:

### Allowed commands

Only `npx` and `uvx` are permitted as skill commands:

```toml
[experts."my-expert".skills."@some/mcp-tool"]
type = "mcpStdioSkill"
command = "npx"           # ✓ allowed
packageName = "@some/mcp-tool"

[experts."my-expert".skills."python-tool"]
type = "mcpStdioSkill"
command = "uvx"           # ✓ allowed
packageName = "python-tool"
```

Arbitrary commands (e.g., `node`, `python`, `./script.sh`) are **not allowed** for published Experts.

### Why this restriction?

The registry only accepts MCP skills from trusted package registries (npm, PyPI via uvx). This provides:

- **Supply chain security** — packages are subject to registry policies
- **Reproducibility** — same package version produces same behavior
- **Auditability** — package sources are publicly inspectable

### Using custom commands locally

For local development, `perstack.toml` accepts any command:

```toml
[experts."local-expert".skills."custom"]
type = "mcpStdioSkill"
command = "node"                    # works locally
args = ["./my-mcp-server.js"]
```

These Experts work with `perstack start` and `perstack run`, but cannot be published.

### Future: Docker-based skills

Docker-based MCP skills are planned, enabling:

- Custom runtime environments
- Isolated execution
- Cross-platform compatibility

Stay tuned for updates.

## Publishing via CLI

Use the `perstack publish` command to publish Experts from your `perstack.toml`:

```bash
# Publish a specific Expert
npx perstack publish my-expert

# Interactive selection (if multiple Experts defined)
npx perstack publish

# Validate without publishing
npx perstack publish my-expert --dry-run
```

### Authentication

Add your API key to `.env`:

```bash
PERSTACK_API_KEY=your-api-key
```

Obtain API keys from your organization dashboard.

## Versioning

The Registry uses [Semantic Versioning](https://semver.org):

| Change type                        | Version bump | Example       |
| ---------------------------------- | ------------ | ------------- |
| Breaking changes                   | MAJOR        | 1.0.0 → 2.0.0 |
| New features (backward compatible) | MINOR        | 1.0.0 → 1.1.0 |
| Bug fixes                          | PATCH        | 1.0.0 → 1.0.1 |

### Write-once immutability

Once a version is published, it **cannot be changed**. This guarantees:
- Dependent Experts always get the same definition
- No supply chain attacks via version tampering
- Reproducible builds

To fix a bug, publish a new version.

## Tags

Tags are mutable pointers to versions:

```bash
npx perstack run @your-org/your-expert@latest "query"
npx perstack run @your-org/your-expert@stable "query"
```

- `latest` — automatically updated on each publish
- Custom tags (e.g., `stable`, `beta`) — manually managed

### Managing tags via CLI

Use the `perstack tag` command to add or update tags:

```bash
# Interactive wizard (select Expert and version)
npx perstack tag

# Add tags to a specific version
npx perstack tag my-expert@1.0.0 stable

# Multiple tags
npx perstack tag my-expert@1.0.0 stable production
```

## Scoped names

Expert names are scoped by organization:

```
@{organization}/{expert-name}
```

- Organization must be registered on the Platform
- Expert names: lowercase letters, numbers, hyphens

## Status management

Expert versions have three status levels:

| Status       | Description                |
| ------------ | -------------------------- |
| `available`  | Normal operation (default) |
| `deprecated` | Warns users, still works   |
| `disabled`   | Prevents new dependencies  |

### Managing status via CLI

Use the `perstack status` command to change version status:

```bash
# Interactive wizard (select Expert and version)
npx perstack status

# Deprecate a version
npx perstack status my-expert@1.0.0 deprecated

# Disable a version
npx perstack status my-expert@1.0.0 disabled
```

### Status transitions

- `available` → `deprecated` ✓
- `available` → `disabled` ✓
- `deprecated` → `disabled` ✓
- `deprecated` → `available` ✗ (cannot revert)
- `disabled` → any ✗ (terminal state)

Versions with active dependents cannot be deleted. Use deprecation to signal migration.

## Unpublishing

Remove a version from the registry:

```bash
# Interactive wizard (select Expert and version)
npx perstack unpublish

# Direct unpublish with confirmation
npx perstack unpublish my-expert@1.0.0 --force
```

The `--force` flag is required when using CLI mode.

## What's next

- [Registry](../understanding-perstack/registry.md) — how the Registry works
- [Registry API](../references/registry-api.md) — programmatic access
