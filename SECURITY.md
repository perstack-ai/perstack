# Security

This document describes the security model of Perstack and provides guidance for secure usage.

## Trust Model

Perstack operates with three levels of trust:

### 1. Experts (perstack.toml)

Experts are defined in configuration files and describe AI agent behavior. They are considered **trusted configuration** because:
- They are local files under your control
- They define which skills (MCP servers) to use
- They specify environment variables to pass to skills

**Risk:** A malicious `perstack.toml` from an untrusted source could reference malicious skills or request sensitive environment variables.

**Mitigation:** Only use expert configurations from trusted sources. Review `requiredEnv` declarations before running.

### 2. Skills (MCP Servers)

Skills are external MCP servers that provide tools to experts. They run as separate processes and can execute arbitrary code.

**Trust Implications:**
- Skills receive environment variables specified in `requiredEnv`
- Skills can execute any code within their process
- Skills can make network requests (restricted in Docker runtime)
- Skills can read/write to the filesystem (restricted in Docker runtime)

**IMPORTANT:** MCP skills are **untrusted code**. A malicious MCP server can:
- Exfiltrate secrets passed via `requiredEnv`
- Execute arbitrary commands
- Access the network (in perstack runtime)
- Read sensitive files (in perstack runtime)

**Mitigation:**
- Use Docker runtime for production workloads
- Only install skills from trusted sources
- Review `requiredEnv` before providing API keys
- Prefer skills with minimal permission requirements

### 3. LLM Outputs

LLM responses drive tool execution. Prompt injection attacks could cause the LLM to:
- Execute destructive commands
- Read/exfiltrate sensitive data
- Deviate from intended behavior

**Mitigation:**
- Use Docker runtime for untrusted inputs
- Review tool call history in development
- Limit max-steps to prevent runaway execution

---

## Runtime Security Comparison

| Security Control       | Docker Runtime             | Perstack Runtime       |
| ---------------------- | -------------------------- | ---------------------- |
| Network Isolation      | ✅ Squid proxy allowlist    | ❌ Unrestricted         |
| Filesystem Isolation   | ✅ Container sandbox        | ❌ Full access          |
| Capability Dropping    | ✅ All capabilities dropped | ❌ Full capabilities    |
| Non-root Execution     | ✅ Runs as `perstack` user  | ❌ Runs as current user |
| Env Variable Filtering | ✅ Strict whitelist         | ✅ Strict whitelist     |
| Read-only Root FS      | ✅ Enabled                  | ❌ N/A                  |
| Resource Limits        | ✅ Memory/CPU/PID limits    | ❌ Unlimited            |
| DNS Rebinding Block    | ✅ Internal IPs blocked     | ❌ N/A                  |

**Recommendation:** Use Docker runtime for:
- Production deployments
- Processing untrusted inputs
- Running untrusted skills
- Multi-tenant environments

---

## Docker Runtime Security Features

### Network Isolation

Outbound network access is restricted by a Squid proxy:
- Only domains in `allowedDomains` are accessible
- Provider API domains (e.g., api.anthropic.com) are auto-included
- All traffic must go through the proxy (HTTP_PROXY enforced)
- **HTTPS only**: All non-CONNECT (HTTP) requests are blocked

**Why HTTPS Only?**

Unencrypted HTTP traffic poses severe security risks:
- Data exfiltration could occur without encryption
- Man-in-the-middle attacks could intercept sensitive data
- Agents should never transmit user data over unencrypted channels

The proxy explicitly denies all non-CONNECT requests (`http_access deny !CONNECT`), ensuring only HTTPS traffic is allowed.

**DNS Rebinding Protection:** The following IP ranges are explicitly blocked:

IPv4:
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918 private)
- `127.0.0.0/8` (loopback)
- `169.254.0.0/16` (link-local, cloud metadata endpoints)

IPv6:
- `::1/128` (loopback)
- `fe80::/10` (link-local)
- `fc00::/7` (unique local addresses)

### Filesystem Isolation

- Container has its own filesystem
- Workspace is mounted as a volume
- Host files (SSH keys, AWS credentials) are not accessible
- Read-only root filesystem with tmpfs for write operations

### Privilege Restrictions

- All Linux capabilities dropped (`cap_drop: ALL`)
- No new privileges allowed (`no-new-privileges: true`)
- Non-root user (`perstack`)
- No access to Docker socket

### Resource Limits

Container resources are constrained to prevent denial of service:
- Memory: 2GB limit, 256MB reservation
- CPU: 2 cores maximum
- Processes: 256 maximum (pids limit)

---

## Environment Variable Handling

Perstack filters environment variables to prevent accidental secret leakage:

### Safe Environment Variables (always passed)

```
PATH, HOME, SHELL, TERM, NODE_PATH
HTTP_PROXY, HTTPS_PROXY, http_proxy, https_proxy
NO_PROXY, no_proxy, PERSTACK_PROXY_URL
NPM_CONFIG_PROXY, NPM_CONFIG_HTTPS_PROXY
```

### Protected Variables (cannot be overridden)

The following variables are protected and cannot be set or overridden via tool inputs:

```
PATH, HOME, SHELL, NODE_PATH
LD_PRELOAD, LD_LIBRARY_PATH (Linux library injection)
DYLD_INSERT_LIBRARIES, DYLD_LIBRARY_PATH (macOS library injection)
NODE_OPTIONS, PYTHONPATH, PERL5LIB, RUBYLIB (interpreter paths)
```

This prevents privilege escalation via PATH hijacking or library injection attacks.

### Skill-Requested Variables

Skills can request additional environment variables via `requiredEnv`:

```toml
[experts."my-expert".skills."my-skill"]
requiredEnv = ["MY_API_KEY"]
```

**Security Warning:** Variables in `requiredEnv` are passed directly to the skill process. Only provide API keys to trusted skills.

### Best Practices

1. Use skill-specific API keys when possible
2. Prefer environment variables with limited scopes
3. Rotate keys if you suspect compromise
4. Review skill source code before providing secrets

---

## Command Execution Security

The `exec` tool provides secure command execution:

- **No Shell Injection:** Uses `execFile` instead of `exec`, preventing shell metacharacter attacks
- **No Shell Initialization:** Because `execFile` bypasses the shell, shell initialization variables (`BASH_ENV`, `ENV`, `IFS`, `CDPATH`) have no effect
- **Protected Variables:** Cannot override PATH, LD_PRELOAD, or other security-sensitive variables (case-insensitive)
- **Default Timeout:** Commands timeout after 60 seconds unless explicitly overridden
- **Path Validation:** Working directory is validated to be within the workspace

---

## File Operation Security

All file operations include symlink attack prevention:

- **O_NOFOLLOW:** File operations use the O_NOFOLLOW flag to prevent symlink following
- **Symlink Detection:** Additional lstat checks detect symbolic links before operations
- **Path Validation:** All paths are validated and resolved via `realpath` before use
- **TOCTOU Mitigation:** Combined symlink checks and O_NOFOLLOW reduce race condition windows

### Platform-Specific Notes

**Windows:** The `O_NOFOLLOW` flag is not supported. Symlink protection relies on lstat checks only. For production workloads on Windows, use Docker runtime for additional isolation.

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and will work with you to resolve the issue.

---

## Security Checklist

### Before Running Experts

- [ ] Review the `perstack.toml` configuration
- [ ] Check which skills are referenced
- [ ] Review `requiredEnv` for each skill
- [ ] Verify skill sources (npm packages, custom commands)
- [ ] Use Docker runtime for untrusted inputs

### For Production Deployment

- [ ] Use Docker runtime (`--runtime docker`)
- [ ] Configure `allowedDomains` restrictively
- [ ] Use minimal `requiredEnv` sets
- [ ] Enable logging for audit purposes
- [ ] Set appropriate `maxSteps` limits
- [ ] Use read-only workspace mounts where possible

### For Skill Authors

- [ ] Request only necessary environment variables
- [ ] Document what each variable is used for
- [ ] Do not log or transmit secrets
- [ ] Use HTTPS for all external communications
- [ ] Handle errors without exposing sensitive data

---

## Acknowledgments

Security is a continuous process. We thank everyone who has contributed to improving Perstack's security posture through responsible disclosure and code review.


