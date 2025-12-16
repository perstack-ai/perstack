# Isolation by Design

Perstack is designed to run inside isolated environments. The runtime itself doesn't enforce security boundaries — your infrastructure does.

For the rationale behind this approach, see [Sandbox Integration](../understanding-perstack/sandbox-integration.md).

## Layers of isolation

| Layer              | Provider                             | Perstack's role                                |
| ------------------ | ------------------------------------ | ---------------------------------------------- |
| **Infrastructure** | Your platform (Docker, ECS, Workers) | Designed to run in any sandboxed environment   |
| **Workspace**      | Perstack                             | Confined file access to a single directory     |
| **Skills**         | Perstack                             | Minimal privilege for MCP servers              |
| **Network**        | Your platform                        | Event-based output — no direct outbound access |

## Infrastructure isolation

Run Experts in isolated environments:

```bash
# Docker
docker run --rm \
  --read-only \
  --network none \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  my-expert
```

**Key controls:**
- `--read-only`: Prevent writes outside workspace
- `--network none`: No network access (except for LLM API)
- Resource limits (`--memory`, `--cpus`)

For cloud platforms (ECS, Cloud Run, Workers), use platform-native isolation features.

## Workspace isolation

Experts can only access files within the workspace directory:

```
/workspace           ← Expert's file access boundary
├── perstack/        ← Runtime-managed (checkpoints, events)
├── input/           ← Your input files
└── output/          ← Expert's output
```

The workspace is the only shared boundary between your system and the Expert. Control what goes in, verify what comes out.

### How it works

All file operations in `@perstack/base` use path validation:

1. **Path resolution**: Relative paths resolved against current working directory
2. **Symlink resolution**: `fs.realpath()` resolves symlinks to their actual target
3. **Boundary check**: Resolved path must start with workspace path
4. **Reserved paths**: `/perstack` directory is always denied (runtime-managed)

### What it protects against

| Attack                                  | Protection                                  |
| --------------------------------------- | ------------------------------------------- |
| Path traversal (`../../../etc/passwd`)  | Resolved path checked against workspace     |
| Symlink escape (symlink → `/etc`)       | `realpath()` resolves before boundary check |
| Absolute path injection (`/etc/passwd`) | Must resolve within workspace               |

### Limitations

**TOCTOU (Time-of-check to time-of-use)**: A symlink could theoretically be modified between validation and actual file operation. In practice, this requires:
- Attacker-controlled code running in the same environment
- Precise timing to modify symlink between check and use

**Mitigation**: Run Experts in isolated containers with read-only root filesystem. The workspace directory should be the only writable location.

### Best practices

```bash
# Docker: read-only root, writable workspace only
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -v $(pwd)/workspace:/workspace \
  my-expert
```

For maximum security, combine workspace isolation with infrastructure isolation.

## Skill isolation

MCP servers run with minimal privilege:

```toml
[experts."analyzer".skills."data"]
type = "mcpStdioSkill"
command = "npx"
packageName = "@example/data-mcp"
requiredEnv = ["DATABASE_URL"]      # Only these env vars passed
pick = ["query"]                    # Only these tools allowed
```

- **Environment**: Only `requiredEnv` variables are passed
- **Tools**: Use `pick`/`omit` to restrict available tools
- **Lifecycle**: Servers start with the Expert, stop when done

## Network boundaries

### Docker runtime (built-in isolation)

When using `--runtime docker`, Perstack provides built-in network isolation via Squid proxy:

```toml
[experts."secure-expert".skills."web-search"]
type = "mcpStdioSkill"
command = "npx"
packageName = "exa-mcp-server"
allowedDomains = ["api.exa.ai"]
```

**How it works:**
1. All outbound traffic routes through a Squid proxy container
2. Only HTTPS (port 443) is allowed
3. Only domains in the allowlist are permitted
4. Provider API domains are auto-included (e.g., `api.anthropic.com`)

**Allowlist sources:**
| Source                 | Description                     |
| ---------------------- | ------------------------------- |
| Skill `allowedDomains` | Per-skill network access        |
| Provider API           | Auto-included based on provider |

> [!TIP]
> Network access is controlled at the **skill level** because all network operations are performed through MCP skills. The Expert itself does not directly access the network.

### Local runtime (infrastructure-controlled)

With the `local` runtime, Perstack outputs events to stdout. Your infrastructure decides what crosses the network boundary:

```
┌─────────────────────────────────────────────────────────┐
│  Isolated Environment                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Perstack Runtime                               │   │
│  │  - Expert execution                             │   │
│  │  - Tool calls                                   │   │
│  │  - Events → stdout                              │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ stdout (JSON events)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Your Infrastructure                                    │
│  - Parse events                                         │
│  - Decide what to forward                               │
│  - Control external access                              │
└─────────────────────────────────────────────────────────┘
```

The agent cannot initiate outbound connections — you control the boundary.

## Checklist

Before deploying to production:

- [ ] Infrastructure isolation configured (container, serverless, or VM)
- [ ] Workspace mounted with appropriate permissions
- [ ] Skills use `requiredEnv` and `pick`/`omit`
- [ ] Network access restricted to LLM API only
- [ ] Event output integrated with your monitoring

## What's next

- [Skill Management](./skill-management.md) — how the runtime manages skills
- [Deployment](./deployment.md) — deploying to production
- [Observing](./observing.md) — monitoring and auditing
- [Sandbox Integration](../understanding-perstack/sandbox-integration.md) — why sandbox-first

