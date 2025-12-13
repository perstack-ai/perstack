# Perstack Security Audit Report

**Date**: December 14, 2025  
**Auditor**: Independent Security Audit  
**Scope**: Complete codebase review of Perstack repository  
**Commit**: debug/docker-runtime branch

---

## Executive Summary

Perstack demonstrates **solid security fundamentals** with comprehensive Docker containerization, environment variable isolation, and input validation using Zod schemas. The codebase shows evidence of security-conscious design decisions. However, **several issues require attention before public open-source release**, most notably a critical dependency vulnerability in the MCP SDK and potential environment variable leakage in the base runtime.

**Overall Security Posture: MODERATE**  
The project is close to being ready for open-source release but requires addressing 1 critical, 2 high, and 3 medium severity findings.

---

## Methodology

1. **Static Code Analysis**: Manual review of all security-critical code paths
2. **Data Flow Analysis**: Traced untrusted input from CLI/TOML to execution
3. **Configuration Review**: Examined Docker, network, and security configurations
4. **Dependency Audit**: Ran `pnpm audit` for known vulnerabilities
5. **Threat Modeling**: Considered adversarial scenarios including malicious MCP skills

---

## Security Findings

### CRITICAL Severity

#### C-1: Vulnerable Dependency - @modelcontextprotocol/sdk DNS Rebinding

**Severity**: Critical  
**CVSS**: High  
**Status**: Open

**Description**:  
The `@modelcontextprotocol/sdk` dependency (version ^1.23.0) is vulnerable to DNS rebinding attacks. This could allow an attacker to bypass same-origin restrictions when the SDK is used with SSE transport.

**Affected Code**:
- `packages/base/package.json:32` - `"@modelcontextprotocol/sdk": "^1.23.0"`
- `packages/runtime/package.json:45` - `"@modelcontextprotocol/sdk": "^1.23.0"`

**Attack Scenario**:
1. Attacker provides a malicious SSE endpoint in skill configuration
2. DNS rebinding allows the endpoint to resolve to internal network addresses
3. Attacker can access internal services or exfiltrate data

**Recommendation**:
```bash
pnpm update @modelcontextprotocol/sdk@^1.24.0
```

**Reference**: https://github.com/advisories/GHSA-w48q-cv73-mx4w

---

### HIGH Severity

#### H-1: Environment Variable Leakage in Non-Docker Runtime

**Severity**: High  
**CVSS**: 7.5

**Description**:  
When running in non-Docker mode, the `exec` tool in `@perstack/base` passes the entire `process.env` to spawned subprocesses, potentially exposing sensitive environment variables (API keys, credentials) to executed commands.

**Affected Code**:
```typescript
// packages/base/src/tools/exec.ts:25-30
const { stdout, stderr } = await execFileAsync(input.command, input.args, {
  cwd: validatedCwd,
  env: { ...process.env, ...input.env },  // <-- ISSUE: passes all env vars
  timeout: input.timeout,
  maxBuffer: 10 * 1024 * 1024,
})
```

**Attack Scenario**:
1. User runs Perstack with `ANTHROPIC_API_KEY` in environment
2. Malicious MCP skill instructs LLM to run: `exec("printenv", [])`
3. API key is exposed in command output

**Mitigating Factors**:
- Docker runtime isolates environment variables correctly (only required vars passed)
- MCP skill manager filters environment variables to `safeEnvVars` list

**Recommendation**:
Apply the same environment filtering used in MCP skill manager to the exec tool:
```typescript
const safeEnvVars = ["PATH", "HOME", "SHELL", "TERM", "NODE_PATH", ...]
const filteredEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => safeEnvVars.includes(key))
)
const { stdout, stderr } = await execFileAsync(input.command, input.args, {
  env: { ...filteredEnv, ...input.env },
  ...
})
```

---

#### H-2: Vulnerable Dependency - jws HMAC Signature Verification

**Severity**: High  
**CVSS**: 7.4

**Description**:  
The `jws` package (version 4.0.0) has improper HMAC signature verification. This is a transitive dependency through `google-auth-library` used by `@ai-sdk/google-vertex`.

**Affected Code**:
- `packages/runtime/package.json` → `@ai-sdk/google-vertex` → `google-auth-library` → `jws@4.0.0`

**Recommendation**:
Add resolution override in root `package.json`:
```json
{
  "pnpm": {
    "overrides": {
      "jws": ">=4.0.1"
    }
  }
}
```

**Reference**: https://github.com/advisories/GHSA-869p-cjfg-cm3x

---

### MEDIUM Severity

#### M-1: Arbitrary MCP Package Installation

**Severity**: Medium  
**CVSS**: 6.5

**Description**:  
Users can specify arbitrary npm packages as MCP skills. While package names are validated against a regex pattern, malicious packages can still be installed and executed.

**Affected Code**:
```typescript
// packages/docker/src/dockerfile-generator.ts:4-5
const VALID_PACKAGE_NAME_PATTERN = /^[@a-zA-Z0-9][@a-zA-Z0-9._\-/]*$/
function isValidPackageName(name: string): boolean {
  return VALID_PACKAGE_NAME_PATTERN.test(name) && !name.includes("..")
}

// packages/docker/src/dockerfile-generator.ts:88
lines.push(`RUN npm install -g ${npmPackages.join(" ")}`)
```

**Attack Scenario**:
1. User installs a legitimate-looking but malicious npm package as skill
2. Package executes arbitrary code during installation or runtime
3. Within Docker: limited by container isolation
4. Without Docker: full system access

**Mitigating Factors**:
- Docker runtime significantly limits impact
- Package name validation prevents path traversal

**Recommendation**:
1. Document security risks of installing third-party MCP skills
2. Consider implementing a skill allowlist/registry verification
3. Add warning when running without Docker runtime

---

#### M-2: SSE Endpoint URL Not Validated

**Severity**: Medium  
**CVSS**: 5.3

**Description**:  
The `mcpSseSkill` endpoint URL accepts any string without validation, allowing connections to arbitrary URLs including internal network addresses.

**Affected Code**:
```typescript
// packages/core/src/schemas/skill.ts:67
endpoint: z.string(),

// packages/runtime/src/skill-manager/mcp.ts:138
const transport = new SSEClientTransport(new URL(skill.endpoint))
```

**Attack Scenario**:
1. Attacker provides skill config with internal endpoint: `http://169.254.169.254/...`
2. Runtime connects to AWS metadata service or other internal resource
3. Sensitive data (IAM credentials) could be retrieved

**Recommendation**:
```typescript
// Add URL validation
endpoint: z.string().url().refine(
  (url) => {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !isPrivateIP(parsed.hostname)
  },
  { message: "Endpoint must be a public HTTPS URL" }
)
```

---

#### M-3: TOCTOU in File Operations

**Severity**: Medium  
**CVSS**: 4.7

**Description**:  
File operations validate paths before operations but a race condition exists between validation and actual file access (Time-of-check to Time-of-use).

**Affected Code**:
```typescript
// packages/base/src/tools/write-text-file.ts:10-17
const validatedPath = await validatePath(path)  // Check
if (existsSync(validatedPath)) {               // Check again
  const stats = statSync(validatedPath)
  if (!(stats.mode & 0o200)) {
    throw new Error(`File ${path} is not writable`)
  }
}
// ... time passes ...
await writeFile(validatedPath, text, "utf-8")   // Use
```

**Practical Impact**: Low. Exploitation requires:
- Precise timing
- Ability to modify filesystem during execution
- Generally limited by container isolation

**Recommendation**:
- Document this as a known limitation
- Consider using atomic file operations where possible
- The current implementation is acceptable for most use cases

---

### LOW Severity

#### L-1: Unlimited maxSteps Default

**Severity**: Low  
**CVSS**: 3.7

**Description**:  
When `maxSteps` is not specified, the runtime can run indefinitely, potentially consuming resources.

**Affected Code**:
```typescript
// packages/runtime/src/state-machine/states/finishing-step.ts:10
if (setting.maxSteps !== undefined && checkpoint.stepNumber >= setting.maxSteps) {
```

**Recommendation**:
Set a sensible default (e.g., 100 steps) rather than unlimited.

---

#### L-2: API Response Not Validated

**Severity**: Low  
**CVSS**: 3.1

**Description**:  
API client does not validate responses from the Perstack API server, trusting all data received.

**Affected Code**:
```typescript
// packages/api-client/v1/client.ts:111
return await response.json()  // No validation
```

**Recommendation**:
Add Zod schema validation for API responses.

---

### INFORMATIONAL

#### I-1: console.error Logs Sensitive Errors

Error messages may contain sensitive information in stack traces when logged to console.

#### I-2: NodeSource Script Piped to Bash

```dockerfile
# packages/docker/src/dockerfile-generator.ts:46
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
```

This is a common pattern but represents a supply chain risk. Consider using official Node.js Docker images instead.

---

## Positive Observations

### Security Measures Done Well

1. **Excellent Docker Hardening**
   - `cap_drop: ALL` drops all Linux capabilities
   - `no-new-privileges: true` prevents privilege escalation
   - `read_only: true` filesystem
   - Non-root user execution (`USER perstack`)
   - Internal network isolation

2. **Environment Variable Isolation (Docker)**
   - Only required environment variables passed to containers
   - `extractRequiredEnvVars` extracts minimal set
   - API keys not leaked to arbitrary processes

3. **Network Isolation**
   - Squid proxy with domain allowlist
   - Internal Docker network prevents direct external access
   - `allowedDomains` validated with proper regex

4. **Input Validation**
   - Comprehensive Zod schemas for all inputs
   - TOML parsing with validation
   - Domain pattern regex validation
   - Package name validation

5. **Shell Command Security**
   - Uses `execFile` instead of `exec` (no shell injection)
   - Path validation with symlink resolution
   - Workspace directory restriction

6. **MCP Skill Environment Filtering**
   - `safeEnvVars` whitelist in skill manager
   - Only `requiredEnv` passed to skills

7. **Comprehensive Security E2E Tests**
   - Network isolation tests
   - Filesystem isolation tests
   - Environment variable isolation tests
   - Docker security test suite

---

## Recommendations

### Immediate Actions (Before Open-Source Release)

1. **Update @modelcontextprotocol/sdk to >=1.24.0** (Critical)
2. **Fix jws dependency vulnerability** (High)
3. **Apply environment filtering to exec tool in base package** (High)

### Short-Term Improvements

4. Add URL validation for SSE endpoints
5. Set default maxSteps limit
6. Add API response validation
7. Document security considerations for third-party MCP skills

### Long-Term Considerations

8. Implement skill registry verification/signing
9. Add security documentation for users
10. Consider security scanning in CI pipeline
11. Add rate limiting for API calls

---

## Verdict

### Is this project ready for open-source release?

**NO - Minor fixes required**

The project demonstrates strong security fundamentals and the development team has clearly considered security throughout the design. However, **3 issues must be addressed before release**:

| Issue                        | Severity | Effort                  | Blocking |
| ---------------------------- | -------- | ----------------------- | -------- |
| C-1: MCP SDK DNS Rebinding   | Critical | Low (dependency update) | **Yes**  |
| H-1: Env var leakage in exec | High     | Low (code change)       | **Yes**  |
| H-2: jws vulnerability       | High     | Low (override)          | **Yes**  |

**Estimated effort to resolve blocking issues**: 1-2 hours

Once these issues are addressed, the project is suitable for open-source release with appropriate security documentation. The Docker runtime provides excellent isolation, and users should be encouraged to use it for untrusted workloads.

---

## Appendix: Files Reviewed

### Critical Security Files
- `packages/base/src/tools/exec.ts`
- `packages/base/src/lib/path.ts`
- `packages/docker/src/docker-adapter.ts`
- `packages/docker/src/env-resolver.ts`
- `packages/docker/src/proxy-generator.ts`
- `packages/docker/src/compose-generator.ts`
- `packages/docker/src/dockerfile-generator.ts`
- `packages/runtime/src/skill-manager/mcp.ts`
- `packages/runtime/src/run.ts`
- `packages/core/src/schemas/perstack-toml.ts`
- `packages/api-client/v1/client.ts`
- `packages/perstack/src/lib/get-env.ts`

### Test Files Reviewed
- `e2e/perstack-cli/docker-security.test.ts`
- `e2e/experts/docker-security.toml`
- `packages/base/src/lib/path.test.ts`

---

*End of Security Audit Report*
