# Security Audit Request: Perstack

> **⚠️ IMPORTANT: Before starting or resuming any audit work, re-read this entire document to avoid drift and hallucination. This document is the single source of truth for audit scope, methodology, and reporting format.**

## Project Overview

Perstack is a package manager and runtime for agent-first development. It provides:

- **Experts**: Modular micro-agents defined declaratively in TOML
- **Runtime**: Executes Experts with deterministic state management, checkpoints, and event sourcing
- **Registry**: Public registry for publishing and sharing Experts (write-once versioning)
- **Skills**: MCP (Model Context Protocol) based tool integration with minimal privilege design
- **Multi-Runtime Support**: Built-in runtime, Docker containerized runtime, and experimental adapters for Cursor, Claude Code, and Gemini CLI

**Repository**: `/Users/masaaki.hirano/depot/perstack`

This project is being prepared for open-source release. The primary concern is whether the implementation is secure enough for public use.

## Multi-Runtime Support

Perstack supports multiple runtimes for flexibility:

| Runtime       | Description                        | Security Layer                                  |
| ------------- | ---------------------------------- | ----------------------------------------------- |
| `perstack`    | Built-in runtime (default)         | perstack.toml-level controls [1]                |
| `docker`      | Containerized with network control | Perstack on Docker (full sandbox + Squid proxy) |
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

The security layers described in this document (container isolation, Squid proxy, DNS rebinding protection, etc.) apply **only to Perstack on Docker**. Other runtimes delegate security to their own implementations:

- **Cursor/Claude Code/Gemini**: Security is handled by each runtime's native mechanisms. Perstack cannot inject or enforce additional security controls.
- **Default Perstack runtime**: Provides perstack.toml-level controls only — no network or container-level isolation.

Perstack treats all runtimes as first-class citizens for usability. However, **security is the runtime's responsibility**, not Perstack's alone. When auditing, focus primarily on:

1. **Docker adapter** (`@perstack/docker`): Where Perstack implements its own security controls
2. **Default runtime** (`@perstack/runtime`): Workspace isolation and skill management
3. **External adapters**: Command construction and output handling (not security enforcement)

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
┌─────────────────────────────────────────────────────┐
│ 1. Sandbox (Infrastructure)                         │  ← Outermost defense
│    Docker, ECS, Workers provide isolation           │
│    Runtime doesn't enforce boundaries - infra does  │
├─────────────────────────────────────────────────────┤
│ 2. Experts (perstack.toml)                          │
│    Trusted configuration defining behavior          │
│    Context isolation between Experts                │
│    requiredEnv, pick/omit limit skill capabilities  │
├─────────────────────────────────────────────────────┤
│ 3. Skills (MCP Servers)                             │  ← Untrusted (RCE)
│    Executes arbitrary npm packages                  │
│    Full code execution within sandbox               │
│    Can exfiltrate secrets passed via requiredEnv    │
├─────────────────────────────────────────────────────┤
│ 4. LLM Outputs                                      │  ← Untrusted core
│    Probabilistic, prompt injection possible         │
│    Decides which skills to invoke                   │
└─────────────────────────────────────────────────────┘
```

### Boundary Points

The sandbox has only two controlled interfaces with the host system and external network:

```
┌─────────────────────────────────────────────────────┐
│  Sandbox (Container)                                │
│  ┌───────────────────────────────────────────────┐  │
│  │  Perstack Runtime                             │  │
│  │  ├── Expert execution                         │  │
│  │  ├── MCP skill servers                        │  │
│  │  └── @perstack/base tools                     │  │
│  └───────────────────────────────────────────────┘  │
│                     │                     │         │
│              ┌──────┴──────┐       ┌──────┴──────┐  │
│              │   stdout    │       │  workspace  │  │
│              │ JSON events │       │   (mount)   │  │
│              └──────┬──────┘       └──────┬──────┘  │
└─────────────────────┼─────────────────────┼─────────┘
                      │                     │
                      ▼                     ▼
              Your Application        Host Filesystem
              (event consumer)        (controlled dir)

┌─────────────────────────────────────────────────────┐
│  Network Boundary (Perstack on Docker)              │
│  ┌───────────────────────────────────────────────┐  │
│  │  All outbound traffic → Squid Proxy           │  │
│  │  ├── HTTPS only (port 443)                    │  │
│  │  ├── Domain allowlist enforced                │  │
│  │  ├── DNS rebinding protection                 │  │
│  │  └── Provider API auto-included               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**System Interface:**
- **stdout (JSON events)**: Only output channel. Application parses events and decides actions.
- **Workspace mount**: Only filesystem interface. Confined to a single directory.

**⚠️ Critical: These interfaces are NOT trust boundaries:**
- **Workspace volume**: Skills can read ALL data in the mounted workspace. Secrets in workspace are exposed to untrusted code.
- **stdout (JSON events)**: Events are generated by untrusted code (LLM + Skills). Applications MUST treat event content as untrusted input (sanitize, validate, guard against injection).

**Network Interface (Perstack on Docker):**
- All traffic forced through Squid proxy
- Only HTTPS allowed (HTTP blocked)
- Only allowedDomains + provider API accessible
- Internal IPs blocked (RFC 1918, loopback, link-local, cloud metadata)

### Runtime Security Comparison

| Security Control       | Perstack on Docker         | Perstack (default)     |
| ---------------------- | -------------------------- | ---------------------- |
| Network Isolation      | ✅ Squid proxy allowlist    | ❌ Unrestricted         |
| Filesystem Isolation   | ✅ Container sandbox        | ❌ Full access          |
| Capability Dropping    | ✅ All capabilities dropped | ❌ Full capabilities    |
| Non-root Execution     | ✅ Runs as `perstack` user  | ❌ Runs as current user |
| Env Variable Filtering | ✅ Strict whitelist         | ✅ Strict whitelist     |
| Read-only Root FS      | ✅ Enabled                  | ❌ N/A                  |
| Resource Limits        | ✅ Memory/CPU/PID limits    | ❌ Unlimited            |
| DNS Rebinding Block    | ✅ Internal IPs blocked     | ❌ N/A                  |

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
- **Dockerfile generation**: Verify generated Dockerfiles don't introduce vulnerabilities
- **Squid proxy configuration**: Validate domain allowlist enforcement, HTTPS-only policy
- **Container hardening**: Check capability dropping, non-root user, read-only root FS
- **DNS rebinding protection**: Verify blocked IP ranges (RFC 1918, loopback, link-local, cloud metadata)
- **Environment variable handling**: Confirm proper isolation and filtering
- **Network namespace isolation**: Verify no bypass paths exist
- **Docker Compose generation**: Check for misconfigurations
- **Known bypass vectors** (verify mitigation or document as limitation):
  - IPv6 handling and blocking
  - Punycode/IDN homograph attacks
  - Trailing dots in domain names (`example.com.` vs `example.com`)
  - Wildcard subdomain handling
  - DoH/DoT (DNS-over-HTTPS/TLS) bypass
  - SNI vs certificate chain validation
- **Disk quota**: Docker does not enforce per-container disk quotas by default — verify tmpfs limits and document infrastructure responsibility

### 2. Base Skill Security (`@perstack/base`)
- **Path validation**: `validateAndResolvePath()` - path traversal prevention
- **Symlink protection**: O_NOFOLLOW usage, lstat checks, TOCTOU windows
- **exec tool**: Shell injection prevention (execFile vs exec), protected variables, timeout handling
- **File operations**: Read/write/delete boundary enforcement
- **Workspace isolation**: Verify all operations are confined to workspace
- **Windows platform limitations**: O_NOFOLLOW not supported on Windows — verify lstat-only protection is documented and users are warned to use `--runtime docker` via WSL2

### 3. Environment Variable Handling
- **Safe variables whitelist**: PATH, HOME, SHELL, TERM, NODE_PATH, proxy vars
- **Protected variables**: PATH, LD_PRELOAD, LD_LIBRARY_PATH, DYLD_*, NODE_OPTIONS, etc.
- **requiredEnv filtering**: Verify only declared vars passed to MCP servers
- **Case-insensitive protection**: Check bypass via case variations

### 4. MCP Skill Management (`@perstack/runtime`)
- **Skill initialization**: Failure handling, cleanup on partial init
- **Tool filtering**: pick/omit enforcement
- **MCP server lifecycle**: Start/stop, no persistent daemons
- **SSE skill**: HTTPS enforcement, authentication handling
- **Stdio skill**: Command injection, package name validation

### 5. Registry Security (`@perstack/api-client`, registry API)
- **Write-once versioning**: Verify immutability of published versions
- **Skill command restrictions**: Only npx/uvx allowed for published Experts
- **Authentication**: API key handling, PERSTACK_API_KEY exposure
- **Content integrity**: Verify no tampering during distribution

### 6. Supply Chain Security (Dependencies)

**AI models often skip examining node_modules. This section requires explicit attention.**

- **package.json analysis**: Review all packages for:
  - Direct dependencies with known vulnerabilities
  - Suspicious or typosquatted package names
  - Unnecessary dependencies that increase attack surface
  
- **pnpm-lock.yaml analysis**: Check for:
  - Pinned versions vs floating versions
  - Integrity hashes present and valid
  - Unexpected transitive dependencies
  
- **Lifecycle scripts (install hooks)**: Examine all packages for:
  - `preinstall`, `install`, `postinstall` scripts
  - `prepare`, `prepublish`, `prepublishOnly` scripts
  - Any script that downloads or executes external code
  
- **Known malicious patterns**:
  - Obfuscated code in install scripts
  - Network requests during installation
  - File system access outside package directory
  - Environment variable harvesting
  - Reverse shells or backdoors

- **Audit commands to run**:
  ```bash
  pnpm audit
  ```

### 7. State Management (`@perstack/storage`)
- **Checkpoint/event files**: Sensitive data in checkpoints
- **Job/Run directories**: Permission handling, race conditions
- **Resume functionality**: State restoration security

### 8. CLI and Entry Points (`@perstack/perstack`)
- **Command parsing**: Injection via CLI arguments
- **Config file loading**: perstack.toml parsing, malicious TOML
- **Environment file loading**: .env file handling

### 9. Context Isolation
- **Expert delegation**: Verify context is never shared between Experts
- **Message history**: Confirm isolation prevents cross-Expert data leakage

### 10. Boundary Point Security
- **Workspace volume**: Verify documentation warns users not to mount directories containing secrets
- **stdout sanitization**: Verify applications consuming events treat them as untrusted (terminal control chars, ANSI escapes, log injection)
- **JSON event validation**: Check for DoS via large outputs, malformed JSON handling

### 11. LLM Provider Integration
- **API key handling**: Ensure no logging or exposure
- **Custom endpoints**: baseUrl validation
- **Response handling**: Malicious LLM responses

### 12. External Runtime Adapters (Experimental)
- **Cursor/Claude Code/Gemini**: Command injection in CLI invocation
- **Event normalization**: Malicious output handling

## Instructions

1. **Use ultrathink repeatedly** - Before analyzing each component, perform deep reasoning. After initial findings, ultrathink again to ensure nothing was missed.

2. **Explore freely** - Do not limit yourself to any predefined file list. Search the codebase, follow code paths, and investigate anything suspicious.

3. **Assume adversarial users** - Consider scenarios where:
   - A user installs a malicious MCP skill from npm
   - A user uses a malicious Expert configuration from the Registry
   - An attacker crafts malicious perstack.toml
   - External services (LLM, MCP servers, SSE endpoints) return malicious data
   - Symlinks or race conditions are exploited
   - Docker container escape is attempted
   - Network isolation is bypassed via DNS rebinding or other techniques

4. **Verify documented security claims** - The project has documented security measures in SECURITY.md. Verify these claims are correctly implemented:
   - DNS rebinding protection
   - HTTPS-only proxy policy
   - Protected environment variables
   - execFile usage (not exec)
   - O_NOFOLLOW flag usage
   - Path validation with realpath
   - Known Limitations section (verify bypass vectors are accurate)
   - TL;DR and Quick Start Security recommendations

5. **Check everything**, including but not limited to:
   - All entry points (CLI, API, programmatic)
   - Data flow from untrusted sources
   - File system operations (symlinks, path traversal)
   - Network operations (proxy bypass, SSRF)
   - Process spawning (command injection)
   - Environment variable handling
   - Serialization/deserialization (Zod schemas, JSON parsing)
   - Dependency security (npm packages)
   - Docker/container security (escape, privilege escalation)
   - Authentication/authorization (API keys, registry access)
   - Error handling and information disclosure
   - Race conditions and TOCTOU
   - Resource exhaustion and DoS

6. **Rate findings** by severity:
   - **Critical**: Immediate exploitation possible, severe impact (container escape, RCE, credential theft)
   - **High**: Exploitable with moderate effort, significant impact
   - **Medium**: Requires specific conditions, moderate impact
   - **Low**: Minor issues, limited impact
   - **Informational**: Best practice recommendations

## Expected Output

### Output Location

Save the audit report to:
```
./agents/audit-reports/[timestamp]_audit_report.md
```

Example: `./agents/audit-reports/2024-12-15T10-30-00_audit_report.md`

### Cross-Report Analysis

Before writing the report, check for previous audit reports in `./agents/audit-reports/`:
1. Review all past reports to identify previously discovered issues
2. Verify whether each past issue has been fixed in the current codebase
3. Track the progression of security posture over time

### Report Structure

A structured security audit report containing:

1. **Package Versions** (Required at the top of every report):
   ```
   ## Audited Package Versions
   - @perstack/core: x.x.x
   - @perstack/runtime: x.x.x
   - @perstack/base: x.x.x
   - @perstack/storage: x.x.x
   - @perstack/perstack: x.x.x
   - @perstack/docker: x.x.x
   - @perstack/tui: x.x.x
   - @perstack/api-client: x.x.x
   - @perstack/cursor: x.x.x
   - @perstack/claude-code: x.x.x
   - @perstack/gemini: x.x.x
   ```

2. **Executive Summary**: Overall security posture in 2-3 sentences, followed by:

   **a) Progress Summary** (comparison with previous audits):
   ```markdown
   ## Security Progress

   | Metric                        | Previous | Current | Change |
   | ----------------------------- | -------- | ------- | ------ |
   | Critical issues               | 2        | 0       | ✅ -2   |
   | High issues                   | 3        | 1       | ✅ -2   |
   | Medium issues                 | 5        | 4       | ✅ -1   |
   | Low issues                    | 8        | 10      | ⚠️ +2   |
   | Issues fixed since last audit | -        | 7       | -      |
   | New issues found              | -        | 3       | -      |
   ```

   **b) Findings Summary** (all current issues):
   ```markdown
   ## Findings Summary

   | ID      | Severity | Finding                | Package           | Location                   | Status      | Since      |
   | ------- | -------- | ---------------------- | ----------------- | -------------------------- | ----------- | ---------- |
   | SEC-001 | Critical | Container escape via X | @perstack/docker  | dockerfile-generator.ts:42 | 🔴 Open      | This audit |
   | SEC-002 | High     | Path traversal in Y    | @perstack/base    | safe-file.ts:15            | ✅ Fixed     | 2024-12-01 |
   | SEC-003 | Medium   | Env var leak in Z      | @perstack/runtime | mcp-skill-manager.ts:88    | 🔴 Open      | 2024-11-15 |
   | SEC-004 | Low      | Info disclosure in W   | @perstack/tui     | error-view.tsx:22          | 🟡 Won't Fix | 2024-11-15 |
   | ...     | ...      | ...                    | ...               | ...                        | ...         | ...        |
   ```

   **Column definitions:**
   - **ID**: Unique identifier (SEC-XXX format, persistent across reports)
   - **Severity**: Critical / High / Medium / Low / Informational
   - **Finding**: Brief title of the vulnerability
   - **Package**: Affected package name
   - **Location**: File path and line number
   - **Status**: 🔴 Open / ✅ Fixed / 🟡 Won't Fix / 🟠 Acknowledged
   - **Since**: Date first discovered (or "This audit" for new findings)
3. **Methodology**: How you conducted the audit
4. **Findings**: Each vulnerability with:
   - Severity rating
   - Description
   - Affected code (file paths, line numbers)
   - Proof of concept or attack scenario
   - Recommended fix
5. **Verification of Security Claims**: Status of each claim in SECURITY.md
6. **Positive Observations**: Security measures done well
7. **Recommendations**: Improvements for security posture
8. **Verdict**: Is this project ready for open-source release? (Yes/No/Conditional with clear justification)

### Post-Report Actions

After completing the audit report:

1. **Update SECURITY.md Known Limitations**: If new bypass vectors or limitations were discovered, add them to the Known Limitations section.

2. **Add Audit History Entry**: Add a new row to the Audit History table in SECURITY.md:
   ```markdown
   | Date       | Versions                       | Auditor      | Summary                                       | Report                               |
   | ---------- | ------------------------------ | ------------ | --------------------------------------------- | ------------------------------------ |
   | YYYY-MM-DD | core@x.x.x, runtime@x.x.x, ... | Auditor Name | Brief summary (X Critical, Y High, Z Medium). | [Report](./agents/audit-reports/...) |
   ```

3. **Create Issues**: For actionable findings (🔴 Open status), create GitHub issues with:
   - Security label
   - Severity in title (e.g., "[SEC-001] Medium: NodeSource script supply chain risk")
   - Link to audit report

## Context on Recent Work

The development team has been working on Docker runtime security features:
- Squid proxy with domain allowlist
- DNS rebinding protection
- HTTPS-only enforcement
- Container hardening (capability drop, non-root, read-only FS)
- Environment variable isolation

**Do not assume their work is correct.** Verify independently. Areas of particular interest:
- `packages/docker/src/` - Dockerfile and docker-compose generation
- `packages/base/src/lib/safe-file.ts` - Symlink protection
- `packages/base/src/tools/exec.ts` - Command execution security
- `packages/runtime/src/skill-manager/` - MCP skill management

## Key Files to Start With

```
SECURITY.md                                    - Security documentation (verify all claims, especially Known Limitations)
packages/docker/src/dockerfile-generator.ts    - Container image generation
packages/docker/src/docker-compose-generator.ts - Network isolation config
packages/docker/src/squid-config-generator.ts  - Proxy configuration
packages/base/src/lib/safe-file.ts             - File operation security
packages/base/src/lib/path.ts                  - Path validation
packages/base/src/tools/exec.ts                - Command execution
packages/runtime/src/skill-manager/            - MCP skill management
packages/perstack/src/lib/get-env.ts           - Environment variable handling
packages/core/src/schemas/                     - Input validation schemas
```

## Starting Point

Begin by exploring the project structure:

```bash
/Users/masaaki.hirano/depot/perstack
```

Read SECURITY.md first to understand the documented security model, then systematically verify each claim against the implementation.

**Start with ultrathink to plan your audit approach, then proceed.**
