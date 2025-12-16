# Registry

The Perstack Registry is a community-driven ecosystem for sharing Experts — like npm, but for AI agents.

## Definition-only

Unlike traditional package registries (npm, PyPI) that distribute executables, the Perstack Registry stores **only Expert definitions** — plain text `perstack.toml` content.

| Traditional Registry             | Perstack Registry              |
| -------------------------------- | ------------------------------ |
| Distributes binaries/executables | Distributes text definitions   |
| Code runs directly               | Runtime interprets definitions |
| Hard to audit                    | Fully transparent              |

This separation clarifies responsibilities:
- **Registry**: Manages *what* Experts do (definitions)
- **Runtime**: Controls *how* Experts execute (in sandbox)

> [!NOTE]
> Text-based definitions can still contain malicious instructions. Registry transparency is one layer — combine with sandbox execution, environment variable control, and workspace isolation for defense in depth.

## Using Registry Experts

Run Experts directly from the Registry:

```bash
npx perstack run @acme/researcher "Analyze market trends"
```

Or reference them as delegates in `perstack.toml`:

```toml
[experts."my-expert"]
instruction = "Delegate research tasks to the researcher."
delegates = ["@org/researcher"]
```

The runtime automatically fetches and caches Registry Experts.

> [!NOTE]
> The runtime first checks `perstack.toml` for a matching Expert key. If not found locally, it fetches from the Registry.

## Versioning

The Registry uses Semantic Versioning (SemVer):

```bash
npx perstack run @acme/researcher@1.2.3 "Analyze market trends"
```

### Write-once immutability

Once published, a version **cannot be changed**:
- Same version number always returns identical content
- Dependency resolution is deterministic
- No supply chain attacks via version tampering

Without a version specifier, `latest` is used:

```bash
npx perstack run @acme/researcher "Analyze market trends"
# equivalent to @acme/researcher@latest
```

## Scoped Experts

Experts are namespaced by organization:

```
@{organization}/{expert-name}
```

Examples:
- `@acme/researcher` — public Expert from Acme org
- `@mycompany/code-reviewer` — private Expert for internal use

## Publishing

Publish Experts using the CLI:

```bash
npx perstack publish my-expert
```

For detailed instructions, see [Publishing Experts](../making-experts/publishing.md).

## Security

The Registry provides several security guarantees:

| Measure                    | What it prevents                         |
| -------------------------- | ---------------------------------------- |
| **Write-once versioning**  | Version tampering, supply chain attacks  |
| **Content integrity**      | MITM attacks during distribution         |
| **Explicit `requiredEnv`** | Unintended environment variable exposure |

Registry security is one layer of defense. See [Sandbox Integration](./sandbox-integration.md) for the full security model.

## API Reference

For programmatic access, see [Registry API Reference](../references/registry-api.md).

