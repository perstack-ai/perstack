# E2E Tests

End-to-end tests for Perstack CLI and runtime. This document serves as the authoritative audit trail for security and functional verification.

## Prerequisites

```bash
pnpm build
```

## Running Tests

```bash
# Run all E2E tests (sequential, fail-fast)
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- run.test.ts

# Run tests matching pattern
pnpm test:e2e -- --testNamePattern "delegate"

# Run Docker security tests only
pnpm test:e2e -- --testNamePattern "Docker"
```

## Test Structure

```
e2e/
├── perstack-cli/                        # perstack CLI tests
│   ├── continue.test.ts                 # Continue job, resume from checkpoint
│   ├── delegate.test.ts                 # Delegate to expert
│   ├── docker-attack-scenarios.test.ts  # Security attack simulations
│   ├── docker-security.test.ts          # Docker sandbox security
│   ├── interactive.test.ts              # Interactive input (with delegation)
│   ├── publish.test.ts                  # Publish expert
│   ├── registry.test.ts                 # Remote expert resolution
│   ├── runtime-selection.test.ts        # Select runtime
│   └── validation.test.ts               # CLI validation
├── perstack-runtime/                    # perstack-runtime CLI tests
│   ├── error-handling.test.ts           # Error handling
│   ├── interactive.test.ts              # Interactive input
│   ├── limits.test.ts                   # Execution limits
│   ├── options.test.ts                  # CLI options
│   ├── run.test.ts                      # Run expert
│   ├── skills.test.ts                   # Skill configuration
│   ├── storage-behavior.test.ts         # Storage behavior
│   └── validation.test.ts               # CLI validation
├── lib/                                 # Test utilities
│   ├── assertions.ts                    # Custom assertions
│   ├── event-parser.ts                  # Runtime event parsing
│   └── runner.ts                        # CLI and Expert execution
├── experts/                             # Expert definitions for tests
└── fixtures/                            # Test fixtures
```

---

## Security Test Audit Trail

This section documents all security-related E2E tests. These tests verify that Perstack's Docker runtime provides proper isolation and protection against common attack vectors.

### Test Package: `@perstack/e2e-mcp-server`

A dedicated MCP server for security testing, published at npm. Provides tools to simulate various attack scenarios:

| Tool              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `http_get`        | HTTP GET requests for network isolation testing                       |
| `fetch_metadata`  | Cloud metadata endpoint access attempts (AWS/GCP/Azure)               |
| `access_internal` | Internal network access attempts (localhost, docker_host, kubernetes) |
| `read_sensitive`  | Sensitive file read attempts (/proc/environ, SSH keys, AWS creds)     |
| `symlink_attack`  | Symlink-based sandbox escape attempts                                 |
| `bypass_proxy`    | HTTP proxy bypass attempts                                            |
| `list_env`        | Environment variable enumeration                                      |

---

## Docker Security Sandbox Tests (`docker-security.test.ts`)

Tests the fundamental security boundaries of the Docker runtime sandbox.

### Network Isolation

| Test                                                             | Purpose                                      | Expected Behavior                    | Security Significance                               |
| ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| `should block access to domains not in allowlist`                | Verify Squid proxy enforces domain allowlist | Access to google.com is blocked      | Prevents data exfiltration to arbitrary domains     |
| `should allow access to domains in allowlist`                    | Verify allowlisted domains are accessible    | Access to api.anthropic.com succeeds | Ensures legitimate API calls work                   |
| `should block HTTP (unencrypted) requests even to valid domains` | Verify HTTP is completely blocked            | Access to http://example.com fails   | Prevents unencrypted data transmission (HTTPS only) |

### Filesystem Isolation

| Test                                      | Purpose                                   | Expected Behavior                    | Security Significance                         |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------ | --------------------------------------------- |
| `should not expose host /etc/shadow`      | Verify host shadow file is not accessible | No password hashes are exposed       | Prevents credential theft from host           |
| `should block path traversal attempts`    | Verify path traversal is blocked          | Access to /../../../etc/passwd fails | Prevents sandbox escape via path manipulation |
| `should not have access to host SSH keys` | Verify host SSH keys are not mounted      | No private keys are exposed          | Prevents lateral movement                     |

### Command Execution Restrictions

| Test                                      | Purpose                             | Expected Behavior    | Security Significance         |
| ----------------------------------------- | ----------------------------------- | -------------------- | ----------------------------- |
| `should not have sudo access`             | Verify sudo is not available        | sudo commands fail   | Prevents privilege escalation |
| `should not have access to docker socket` | Verify docker socket is not mounted | docker commands fail | Prevents container escape     |

### Environment Variable Isolation

| Test                                                | Purpose                    | Expected Behavior                                              | Security Significance   |
| --------------------------------------------------- | -------------------------- | -------------------------------------------------------------- | ----------------------- |
| `should only expose required environment variables` | Verify env filtering works | AWS_SECRET_ACCESS_KEY, GITHUB_TOKEN, SSH_AUTH_SOCK not exposed | Prevents secret leakage |

### Skill-level allowedDomains

| Test                                                    | Purpose                                            | Expected Behavior                    | Security Significance                  |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `should allow access to domains in skill allowlist`     | Verify skill-level domain allowlist                | Access to api.github.com succeeds    | Fine-grained network control per skill |
| `should block access to domains not in skill allowlist` | Verify domains outside skill allowlist are blocked | Access to api.example.com fails      | Defense in depth for network isolation |
| `should auto-include provider API domain`               | Verify provider domain is auto-added               | Access to api.anthropic.com succeeds | Ensures LLM API connectivity           |

### Multiple Skills allowedDomains Merge

| Test                                                    | Purpose                                   | Expected Behavior                              | Security Significance                  |
| ------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| `should merge allowedDomains from multiple skills`      | Verify domains from all skills are merged | Both api.github.com and httpbin.org accessible | Correct multi-skill domain aggregation |
| `should still block domains not in any skill allowlist` | Verify non-listed domains remain blocked  | Access to api.example.com fails                | Merge doesn't create security holes    |

---

## Docker Attack Scenarios Tests (`docker-attack-scenarios.test.ts`)

Simulates real-world attack scenarios against the Docker runtime to verify defenses.

### Cloud Metadata Protection

These tests verify protection against SSRF attacks targeting cloud metadata endpoints, which could lead to credential theft in cloud environments.

| Test                                                   | Purpose                        | Attack Vector                                                 | Expected Defense                                              |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `should block AWS metadata endpoint (169.254.169.254)` | Prevent AWS credential theft   | Access to http://169.254.169.254/latest/meta-data/            | Request blocked/timeout, no ami-id or iam credentials exposed |
| `should block GCP metadata endpoint`                   | Prevent GCP credential theft   | Access to http://metadata.google.internal/computeMetadata/v1/ | Request blocked/timeout                                       |
| `should block Azure metadata endpoint`                 | Prevent Azure credential theft | Access to http://169.254.169.254/metadata/instance            | Request blocked/timeout                                       |

### SSRF Prevention

These tests verify protection against Server-Side Request Forgery attacks targeting internal network resources.

| Test                                        | Purpose                                 | Attack Vector                                      | Expected Defense           |
| ------------------------------------------- | --------------------------------------- | -------------------------------------------------- | -------------------------- |
| `should block localhost access`             | Prevent access to local services        | Access to http://127.0.0.1:80/                     | Connection refused/blocked |
| `should block docker host access`           | Prevent container escape via docker API | Access to http://host.docker.internal:2375/version | Connection blocked         |
| `should block kubernetes service discovery` | Prevent k8s API access                  | Access to https://kubernetes.default.svc/api       | Connection blocked         |
| `should block metadata IP directly`         | Prevent direct metadata IP access       | Access to http://169.254.169.254/                  | Connection blocked         |

### Sensitive File Protection

These tests verify that sensitive files are not accessible from within the container.

| Test                                     | Purpose                              | Attack Vector               | Expected Defense                                    |
| ---------------------------------------- | ------------------------------------ | --------------------------- | --------------------------------------------------- |
| `should block /proc/self/environ access` | Prevent environment variable leakage | Read /proc/self/environ     | No API keys (ANTHROPIC_API_KEY, AWS_SECRET) exposed |
| `should block /etc/shadow access`        | Prevent password hash access         | Read /etc/shadow            | Permission denied or file not found                 |
| `should not expose host SSH keys`        | Prevent SSH key theft                | Read ~/.ssh/id_rsa          | No private keys exposed                             |
| `should not expose AWS credentials`      | Prevent AWS credential theft         | Read ~/.aws/credentials     | No aws_secret_access_key exposed                    |
| `should block docker socket access`      | Prevent container escape             | Access /var/run/docker.sock | File not found or permission denied                 |

### Symlink Attack Prevention

These tests verify protection against symlink-based sandbox escape attempts.

| Test                                                            | Purpose                          | Attack Vector                           | Expected Defense                                                      |
| --------------------------------------------------------------- | -------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `should allow symlink to container /etc/passwd (not host file)` | Verify container isolation       | Create symlink to /etc/passwd           | Container's /etc/passwd readable (expected), host file NOT accessible |
| `should block symlink to /etc/shadow due to permissions`        | Verify permission enforcement    | Create symlink to /etc/shadow           | Permission denied                                                     |
| `should not expose host files via symlink`                      | Verify host filesystem isolation | Create symlink to /host-root/etc/passwd | File not found (host root not mounted)                                |

### Proxy Bypass Prevention

These tests verify that the HTTP proxy cannot be bypassed.

| Test                                             | Purpose                                   | Attack Vector                                 | Expected Defense            |
| ------------------------------------------------ | ----------------------------------------- | --------------------------------------------- | --------------------------- |
| `should not allow proxy bypass via env override` | Prevent proxy bypass by clearing env vars | Remove HTTP_PROXY env and make direct request | Request still blocked/fails |

### Environment Variable Isolation

These tests verify that sensitive environment variables are not exposed.

| Test                                                | Purpose                                    | Attack Vector                  | Expected Defense                                    |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------- |
| `should not expose sensitive environment variables` | Prevent secret leakage via env enumeration | List all environment variables | AWS_SECRET_ACCESS_KEY, GITHUB_TOKEN not in env list |

---

## Functional Test Categories

### perstack-cli/

#### Continue Job (`continue.test.ts`)

| Test                                                            | Purpose                                           |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `should continue job with --continue-job`                       | Verify job continuation from interactive stop     |
| `should complete after continue`                                | Verify job completes after continuation           |
| `should continue after parallel delegation and complete`        | Verify continuation after parallel delegate stops |
| `should capture checkpoint ID for resume-from`                  | Verify checkpoint ID is captured for resume       |
| `should fail when --resume-from is used without --continue-job` | Verify CLI validation for resume flags            |

#### Delegate to Expert (`delegate.test.ts`)

| Test                                                   | Purpose                                    |
| ------------------------------------------------------ | ------------------------------------------ |
| `should delegate to another expert`                    | Verify basic delegation works              |
| `should chain through multiple experts`                | Verify multi-level delegation chains       |
| `should return through chain and complete all runs`    | Verify delegation chain completes          |
| `should delegate to multiple experts in parallel`      | Verify parallel delegation                 |
| `should complete all parallel delegations`             | Verify all parallel delegates complete     |
| `should resume coordinator after delegations complete` | Verify coordinator resumes after delegates |

#### Interactive Input (`interactive.test.ts`)

| Test                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `should execute MCP tool before delegate`        | Verify MCP tools execute before delegation     |
| `should collect partial results before stopping` | Verify partial results are preserved           |
| `should resume and stop at interactive tool`     | Verify resume and interactive stop sequence    |
| `should have all partial results when stopped`   | Verify checkpoint contains all partial results |

#### Runtime Selection (`runtime-selection.test.ts`)

| Test                                                                 | Purpose                               |
| -------------------------------------------------------------------- | ------------------------------------- |
| `should run with perstack runtime`                                   | Verify perstack runtime works         |
| `should reject invalid runtime names`                                | Verify invalid runtime validation     |
| `should show helpful error or succeed for cursor`                    | Verify cursor runtime handling        |
| `should show helpful error for claude-code when unavailable`         | Verify claude-code runtime handling   |
| `should show helpful error for gemini when unavailable`              | Verify gemini runtime handling        |
| `should show helpful error for docker when unavailable`              | Verify docker runtime handling        |
| `should use runtime from perstack.toml when --runtime not specified` | Verify config-based runtime selection |

#### Publish Expert (`publish.test.ts`)

| Test                                                         | Purpose                              |
| ------------------------------------------------------------ | ------------------------------------ |
| `should output JSON payload for valid expert with --dry-run` | Verify publish preview               |
| `should fail for nonexistent expert`                         | Verify nonexistent expert validation |
| `should fail with nonexistent config file`                   | Verify config file validation        |
| `should fail when no config in directory`                    | Verify config discovery              |
| `should fail without version` (unpublish)                    | Verify unpublish validation          |
| `should fail without --force when version provided`          | Verify unpublish force flag          |
| `should fail without version` (tag)                          | Verify tag validation                |
| `should fail without tags`                                   | Verify tag arguments                 |
| `should fail without version` (status)                       | Verify status validation             |
| `should fail without status value`                           | Verify status value required         |
| `should fail with invalid status value`                      | Verify status value validation       |

#### Registry (`registry.test.ts`)

| Test                                                                  | Purpose                                        |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| `should fail gracefully for nonexistent remote expert`                | Verify remote expert resolution error handling |
| `should fail gracefully for invalid expert key format`                | Verify expert key format validation            |
| `should fail gracefully when delegating to nonexistent remote expert` | Verify remote delegation error handling        |

#### CLI Validation (`validation.test.ts`)

| Test                                                            | Purpose                               |
| --------------------------------------------------------------- | ------------------------------------- |
| `should fail without arguments`                                 | Verify run command requires arguments |
| `should fail with only expert key`                              | Verify run command requires query     |
| `should fail for nonexistent expert`                            | Verify expert existence validation    |
| `should fail with nonexistent config file`                      | Verify config file validation         |
| `should fail when --resume-from is used without --continue-job` | Verify resume flag dependency         |
| `should reject invalid runtime name`                            | Verify runtime name validation        |
| `should fail with clear message for nonexistent delegate`       | Verify delegate existence validation  |

### perstack-runtime/

#### Run Expert (`run.test.ts`)

| Test                                           | Purpose                         |
| ---------------------------------------------- | ------------------------------- |
| `should answer a simple question and complete` | Verify basic expert execution   |
| `should execute multiple tools in parallel`    | Verify parallel tool execution  |
| `should use think tool`                        | Verify think tool works         |
| `should read PDF file`                         | Verify PDF reading capability   |
| `should read image file`                       | Verify image reading capability |
| `should search the web`                        | Verify web search capability    |
| `should complete run successfully`             | Verify successful completion    |
| `should read and summarize PDF content`        | Verify PDF comprehension        |
| `should read and describe image content`       | Verify image comprehension      |

#### CLI Options (`options.test.ts`)

| Test                                 | Purpose                   |
| ------------------------------------ | ------------------------- |
| `should accept --provider option`    | Verify provider option    |
| `should accept --model option`       | Verify model option       |
| `should accept --temperature option` | Verify temperature option |
| `should accept --max-steps option`   | Verify max-steps option   |
| `should accept --max-retries option` | Verify max-retries option |
| `should accept --timeout option`     | Verify timeout option     |
| `should accept --job-id option`      | Verify job-id option      |
| `should accept --run-id option`      | Verify run-id option      |
| `should accept --env-path option`    | Verify env-path option    |
| `should accept --verbose option`     | Verify verbose option     |

#### Execution Limits (`limits.test.ts`)

| Test                                                         | Purpose                      |
| ------------------------------------------------------------ | ---------------------------- |
| `should accept --max-steps option and complete within limit` | Verify max-steps enforcement |
| `should accept --max-retries option`                         | Verify max-retries option    |

#### Skills (`skills.test.ts`)

| Test                                               | Purpose                        |
| -------------------------------------------------- | ------------------------------ |
| `should only have access to picked tools`          | Verify pick tool filtering     |
| `should be able to use picked tools`               | Verify picked tools work       |
| `should not have access to omitted tools`          | Verify omit tool filtering     |
| `should have access to tools from multiple skills` | Verify multi-skill tool access |

#### Interactive Input (`interactive.test.ts`)

| Test                                                  | Purpose                               |
| ----------------------------------------------------- | ------------------------------------- |
| `should stop at interactive tool and emit checkpoint` | Verify interactive tool stop behavior |

#### Error Handling (`error-handling.test.ts`)

| Test                                                                 | Purpose                    |
| -------------------------------------------------------------------- | -------------------------- |
| `should recover from file not found error and complete successfully` | Verify tool error recovery |
| `should fail gracefully when MCP skill command is invalid`           | Verify MCP error handling  |
| `should fail with invalid provider name`                             | Verify provider validation |

#### Storage Behavior (`storage-behavior.test.ts`)

| Test                                                      | Purpose                                    |
| --------------------------------------------------------- | ------------------------------------------ |
| `should create storage files when running expert`         | Verify perstack CLI creates storage        |
| `should NOT create new storage files when running expert` | Verify perstack-runtime CLI has no storage |

#### CLI Validation (`validation.test.ts`)

| Test                                       | Purpose                       |
| ------------------------------------------ | ----------------------------- |
| `should show version`                      | Verify --version flag         |
| `should show help`                         | Verify --help flag            |
| `should show run command help`             | Verify run --help             |
| `should fail without arguments`            | Verify run requires arguments |
| `should fail with only expert key`         | Verify run requires query     |
| `should fail for nonexistent expert`       | Verify expert validation      |
| `should fail with nonexistent config file` | Verify config validation      |

---

## Architecture Notes

### Two CLIs

| CLI                | Package             | Storage                           | Use Case                     |
| ------------------ | ------------------- | --------------------------------- | ---------------------------- |
| `perstack`         | `packages/perstack` | Creates files in `perstack/jobs/` | Primary user-facing CLI      |
| `perstack-runtime` | `packages/runtime`  | No storage (JSON events only)     | Standalone runtime execution |

### Key Differences

- **perstack CLI**: Uses `@perstack/runner` to dispatch to adapters. Manages storage, delegation resumption, and runtime selection.
- **perstack-runtime CLI**: Lightweight wrapper that executes experts and outputs JSON events. Does not handle delegation resumption or storage.

### Runtime Adapters

All runtimes (perstack, cursor, claude-code, gemini, docker) are treated equally via the adapter pattern:

- Each adapter implements `RuntimeAdapter` interface
- `@perstack/runner` dispatches to adapters uniformly
- Storage is handled by runner, not by adapters

### Docker Runtime Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Host Machine                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Docker Container                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ perstack-    │  │ MCP Skills   │  │ Squid Proxy  │  │  │
│  │  │ runtime      │  │              │  │ (allowlist)  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │                           │                 │           │  │
│  │                           ▼                 ▼           │  │
│  │                    HTTP_PROXY ──────► Squid ──────►     │  │
│  │                                      (filter)     Internet │
│  │  Security Layers:                                       │  │
│  │  • Non-root user (perstack)                             │  │
│  │  • Read-only root filesystem                            │  │
│  │  • No capabilities (cap_drop: ALL)                      │  │
│  │  • No new privileges                                    │  │
│  │  • Network isolation via Squid proxy                    │  │
│  │  • Env filtering (SAFE_ENV_VARS only)                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  NOT mounted:                                                │
│  • /var/run/docker.sock                                      │
│  • ~/.ssh/                                                   │
│  • ~/.aws/                                                   │
│  • /etc/shadow (host)                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Test Execution Notes

- Tests run sequentially with `fileParallelism: false` to reduce CPU load
- `--bail=1` stops on first failure for faster feedback
- Runtime tests require API keys (set in `.env.local`)
- TUI-based commands (`start`) are excluded from E2E tests
- External runtime tests (cursor, claude-code, gemini) pass regardless of CLI availability
- Docker tests are skipped if Docker is not available (`isDockerAvailable()` check)

---

## Summary Statistics

| Category                    | Test Count |
| --------------------------- | ---------- |
| Docker Security Sandbox     | 14         |
| Docker Attack Scenarios     | 17         |
| Continue Job                | 5          |
| Delegate to Expert          | 6          |
| Interactive Input (CLI)     | 4          |
| Runtime Selection           | 7          |
| Publish Expert              | 11         |
| Registry                    | 3          |
| CLI Validation (perstack)   | 7          |
| Run Expert                  | 9          |
| CLI Options                 | 10         |
| Execution Limits            | 2          |
| Skills                      | 4          |
| Interactive Input (runtime) | 1          |
| Error Handling              | 3          |
| Storage Behavior            | 2          |
| CLI Validation (runtime)    | 7          |
| **Total**                   | **112**    |

**Security-focused tests: 31** (Docker Security + Docker Attack Scenarios)
