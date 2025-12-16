# Security Audit Request: Perstack

> **Before starting or resuming any audit work, re-read this entire document to avoid drift and hallucination. This document is the single source of truth for audit scope, methodology, and reporting format.**

## Project Overview

Perstack is a package manager and runtime for agent-first development. It provides:

- **Experts**: Modular micro-agents defined declaratively in TOML
- **Runtime**: Executes Experts with deterministic state management, checkpoints, and event sourcing
- **Registry**: Public registry for publishing and sharing Experts (write-once versioning)
- **Skills**: MCP (Model Context Protocol) based tool integration with minimal privilege design
- **Multi-Runtime Support**: Built-in runtime, Docker containerized runtime, and experimental adapters for Cursor, Claude Code, and Gemini CLI

**Repository**: `https://github.com/perstack-ai/perstack`

This project is being prepared for open-source release. The primary concern is whether the implementation is secure enough for public use.

## Multi-Runtime Support

Perstack supports multiple runtimes for flexibility:

| Runtime       | Description                        | Security Layer                                  |
| ------------- | ---------------------------------- | ----------------------------------------------- |
| `docker`      | Containerized with network control | Perstack on Docker (full sandbox + Squid proxy) |
| `local`       | Built-in runtime                   | perstack.toml-level controls [1]                |
| `cursor`      | Cursor CLI (experimental)          | Cursor's own security                           |
| `claude-code` | Claude Code CLI (experimental)     | Claude Code's own security                      |
| `gemini`      | Gemini CLI (experimental)          | Gemini's own security                           |

[1] **perstack.toml-level controls** include:

- `requiredEnv` filtering (minimal privilege for secrets)
- `pick`/`omit` tool filtering
- Context isolation between Experts
- Protected variables (PATH, LD_PRELOAD, etc.)
- Workspace path validation (@perstack/base)
- Shell injection prevention (execFile)

Does NOT include: container isolation, network isolation, resource limits, privilege dropping.

**Important Note for Auditors:**

The security layers described in this document (container isolation, Squid proxy, DNS rebinding protection, etc.) apply **only to Perstack on Docker**. Other runtimes delegate security to their own implementations.

## Architecture Overview

### Package Structure

```
Core:
  @perstack/core        - Schemas, types (source of truth)
  @perstack/runtime     - Execution engine, state machine, skill managers
  @perstack/storage     - Checkpoint and event persistence

Skills:
  @perstack/base        - Built-in MCP tools (file ops, exec, think, todo)

CLI:
  @perstack/perstack    - CLI package (perstack start/run/publish)
  @perstack/tui         - Terminal UI

Adapters:
  @perstack/docker      - Docker adapter with network isolation
  @perstack/cursor      - Cursor adapter (experimental)
  @perstack/claude-code - Claude Code adapter (experimental)
  @perstack/gemini      - Gemini adapter (experimental)

API:
  @perstack/api-client  - Registry API client
```

### Trust Model (Four Layers - Defense in Depth)

LLM outputs and MCP Skills are inherently untrusted. The two upper layers provide defense:

```
1. Sandbox (Infrastructure)     <- Outermost defense
   Docker, ECS, Workers provide isolation

2. Experts (perstack.toml)
   Trusted configuration, context isolation
   requiredEnv, pick/omit limit skill capabilities

3. Skills (MCP Servers)         <- Untrusted (RCE)
   Full code execution within sandbox

4. LLM Outputs                  <- Untrusted core
   Probabilistic, prompt injection possible
```

### Runtime Security Comparison

| Security Control       | Perstack on Docker       | Perstack (default)   |
| ---------------------- | ------------------------ | -------------------- |
| Network Isolation      | Squid proxy allowlist    | Unrestricted         |
| Filesystem Isolation   | Container sandbox        | Full access          |
| Capability Dropping    | All capabilities dropped | Full capabilities    |
| Non-root Execution     | Runs as `perstack` user  | Runs as current user |
| Env Variable Filtering | Strict whitelist         | Strict whitelist     |
| Read-only Root FS      | Enabled                  | N/A                  |
| Resource Limits        | Memory/CPU/PID limits    | Unlimited            |
| DNS Rebinding Block    | Internal IPs blocked     | N/A                  |

## Audit Objective

Perform a comprehensive, independent security audit of the entire codebase. Identify vulnerabilities, security weaknesses, or design flaws that could:

- Expose user secrets (API keys, credentials)
- Allow unauthorized system access
- Enable sandbox/container escape
- Permit network isolation bypass
- Allow code injection or arbitrary code execution
- Enable path traversal or symlink attacks
- Cause denial of service
- Leak sensitive information through error messages or logs
- Allow supply chain attacks via registry
- Create other security risks for users

## Specific Areas to Audit

### 1. Docker Runtime Security (`@perstack/docker`)

- Dockerfile generation
- Squid proxy configuration
- Container hardening
- DNS rebinding protection
- Environment variable handling
- Network namespace isolation
- Docker Compose generation
- Known bypass vectors (IPv6, Punycode, DoH/DoT, etc.)

### 2. Base Skill Security (`@perstack/base`)

- Path validation: `validateAndResolvePath()`
- Symlink protection: O_NOFOLLOW usage, lstat checks, TOCTOU windows
- exec tool: Shell injection prevention, protected variables, timeout handling
- File operations: Read/write/delete boundary enforcement
- Workspace isolation

### 3. Environment Variable Handling

- Safe variables whitelist
- Protected variables
- requiredEnv filtering
- Case-insensitive protection

### 4. MCP Skill Management (`@perstack/runtime`)

- Skill initialization
- Tool filtering (pick/omit)
- MCP server lifecycle
- SSE skill: HTTPS enforcement, authentication handling
- Stdio skill: Command injection, package name validation

### 5. Registry Security (`@perstack/api-client`)

- Write-once versioning
- Skill command restrictions
- Authentication
- Content integrity

### 6. Supply Chain Security

- package.json analysis
- pnpm-lock.yaml analysis
- Lifecycle scripts (install hooks)
- Known malicious patterns

## Instructions

1. **Use ultrathink repeatedly** - Before analyzing each component, perform deep reasoning
2. **Explore freely** - Do not limit yourself to any predefined file list
3. **Assume adversarial users** - Consider malicious MCP skills, Experts, perstack.toml, etc.
4. **Verify documented security claims** - Check SECURITY.md claims against implementation
5. **Check everything** - Entry points, data flow, file system, network, process spawning, etc.
6. **Rate findings** by severity: Critical, High, Medium, Low, Informational

## Expected Output

### Output Location

Save the audit report to:

```
.agent/reports/audit-reports/[timestamp]_audit_report.md
```

### Report Structure

1. **Package Versions** (Required at the top)
2. **Executive Summary**
3. **Progress Summary** (comparison with previous audits)
4. **Findings Summary** (table with ID, Severity, Finding, Package, Location, Status, Since)
5. **Methodology**
6. **Findings** (each with severity, description, affected code, PoC, recommended fix)
7. **Verification of Security Claims**
8. **Positive Observations**
9. **Recommendations**
10. **Verdict** (Ready for release? Yes/No/Conditional)

### Post-Report Actions

1. Update SECURITY.md Known Limitations if new vectors discovered
2. Add Audit History Entry to SECURITY.md
3. Create GitHub issues for actionable findings

## Key Files to Start With

```
SECURITY.md
packages/docker/src/dockerfile-generator.ts
packages/docker/src/docker-compose-generator.ts
packages/docker/src/squid-config-generator.ts
packages/base/src/lib/safe-file.ts
packages/base/src/lib/path.ts
packages/base/src/tools/exec.ts
packages/runtime/src/skill-manager/
packages/perstack/src/lib/get-env.ts
packages/core/src/schemas/
```

**Start with ultrathink to plan your audit approach, then proceed.**
