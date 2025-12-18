/**
 * Docker Security Sandbox E2E Tests
 *
 * Tests security isolation features of the Docker runtime environment:
 * - Network isolation (allowedDomains, HTTPS-only)
 * - Filesystem isolation (no host file access, path traversal prevention)
 * - Command execution restrictions (no sudo, no docker socket)
 * - Environment variable isolation (no host secrets leaked)
 * - Skill-level allowedDomains enforcement
 *
 * TOML: e2e/experts/docker-security.toml
 * Runtime: Docker (tests skipped if Docker unavailable)
 */
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { isDockerAvailable } from "../lib/prerequisites.js"
import { runCli } from "../lib/runner.js"

const CONFIG = "./e2e/experts/docker-security.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 300000

let workspaceDir: string

function dockerRunArgs(expertKey: string, query: string): string[] {
  const args = ["run", "--config", CONFIG, "--runtime", "docker"]
  args.push("--workspace", workspaceDir)
  args.push("--env", "NPM_CONFIG_USERCONFIG")
  args.push(expertKey, query)
  return args
}

describe.runIf(isDockerAvailable()).concurrent("Docker Security Sandbox", () => {
  beforeAll(() => {
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-e2e-"))
    if (process.env.NPM_TOKEN) {
      const npmrcContent = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`
      fs.writeFileSync(path.join(workspaceDir, ".npmrc"), npmrcContent, { mode: 0o600 })
      // NPM_CONFIG_USERCONFIG points to /workspace/.npmrc inside Docker container
      process.env.NPM_CONFIG_USERCONFIG = "/workspace/.npmrc"
    }
  })

  afterAll(() => {
    if (workspaceDir && fs.existsSync(workspaceDir)) {
      fs.rmSync(workspaceDir, { recursive: true, force: true })
    }
    delete process.env.NPM_CONFIG_USERCONFIG
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Network Isolation Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that network requests to domains not in allowlist are blocked.
   * google.com is not in any allowlist, so curl should fail.
   */
  it("should block access to domains not in allowlist", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-network",
        "Try to access google.com using curl and report if it succeeds or fails",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.stdout + result.stderr).toMatch(
      /blocked|denied|refused|timeout|unreachable|failed|not allowed/i,
    )
  })

  /**
   * Verifies that network requests to provider API domain succeed.
   * api.anthropic.com is auto-included from provider configuration.
   */
  it("should allow access to domains in allowlist", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-network",
        "Try to access api.anthropic.com using curl and report the HTTP status code",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
  })

  /**
   * Verifies that HTTP (non-HTTPS) requests are blocked.
   * Only port 443 (HTTPS) is allowed for security.
   */
  it("should block HTTP (unencrypted) requests even to valid domains", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-network",
        "Try to access http://example.com on port 80 (not HTTPS) and report if it succeeds or fails",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.stdout + result.stderr).toMatch(
      /blocked|denied|refused|forbidden|failed|not allowed|error/i,
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Filesystem Isolation Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that host's /etc/shadow is not accessible.
   * Container may have its own /etc/shadow, but host passwords must not leak.
   */
  it("should not expose host /etc/shadow", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-filesystem",
        "Try to read /etc/shadow and report what you find",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).not.toMatch(/root:\$|root:x:/)
  })

  /**
   * Verifies that path traversal attacks are blocked.
   * Attempts to escape workspace via /../../../ should fail.
   */
  it("should block path traversal attempts", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-filesystem",
        "Try to read /../../../etc/passwd using path traversal",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).toMatch(/denied|not found|error|permission|restricted|failed/i)
  })

  /**
   * Verifies that host SSH keys are not accessible.
   * ~/.ssh directory is not mounted in container.
   */
  it("should not have access to host SSH keys", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-filesystem",
        "Try to read ~/.ssh/id_rsa and report what you find",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).not.toMatch(/-----BEGIN.*PRIVATE KEY-----/)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Command Execution Restriction Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that sudo is not available in container.
   * Privilege escalation must be prevented.
   */
  it("should not have sudo access", async () => {
    const result = await runCli(
      dockerRunArgs("docker-security-commands", "Try to run 'sudo whoami' and report the result"),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).toMatch(/not found|permission denied|cannot|failed|error/i)
  })

  /**
   * Verifies that Docker socket is not accessible.
   * Container escape via docker-in-docker must be prevented.
   */
  it("should not have access to docker socket", async () => {
    const result = await runCli(
      dockerRunArgs("docker-security-commands", "Try to run 'docker ps' and report the result"),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).toMatch(/not found|permission denied|cannot connect|failed|error/i)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Environment Variable Isolation Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that sensitive host environment variables are not leaked.
   * AWS credentials, GitHub tokens, SSH auth sock must not be exposed.
   */
  it("should only expose required environment variables", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-env",
        "Run 'env' command and list all environment variables you can see",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).not.toMatch(/AWS_SECRET_ACCESS_KEY=/)
    expect(output).not.toMatch(/GITHUB_TOKEN=/)
    expect(output).not.toMatch(/SSH_AUTH_SOCK=/)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Skill-level allowedDomains Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that skill-level allowedDomains are enforced.
   * api.github.com is explicitly allowed in skill configuration.
   */
  it("should allow access to domains in skill allowlist", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-skill-allowlist",
        "Try to access api.github.com using curl and report if it succeeds",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
  })

  /**
   * Verifies that domains not in skill allowlist are blocked.
   * api.example.com is not in any allowlist.
   */
  it("should block access to domains not in skill allowlist", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-skill-allowlist",
        "Try to access api.example.com using curl and report if it fails",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).toMatch(/blocked|denied|refused|timeout|unreachable|failed|not allowed/i)
  })

  /**
   * Verifies that provider API domain is auto-included.
   * api.anthropic.com should always be accessible for LLM calls.
   */
  it("should auto-include provider API domain", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-skill-allowlist",
        "Try to access api.anthropic.com using curl and report if it succeeds",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-skill allowedDomains Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that allowedDomains from multiple skills are merged.
   * Both api.github.com (from network-github) and httpbin.org (from network-httpbin)
   * should be accessible when both skills are configured.
   */
  it("should merge allowedDomains from multiple skills", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-multi-skill",
        "Try to access both api.github.com and httpbin.org, report if both succeed",
      ),
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
  })

  /**
   * Verifies that domains not in any skill's allowlist are still blocked.
   * api.example.com should fail even with multi-skill configuration.
   */
  it("should still block domains not in any skill allowlist", async () => {
    const result = await runCli(
      dockerRunArgs(
        "docker-security-multi-skill",
        "Try to access api.example.com using curl and report if it fails",
      ),
      { timeout: LLM_TIMEOUT },
    )
    const output = result.stdout + result.stderr
    expect(output).toMatch(/blocked|denied|refused|timeout|unreachable|failed|not allowed/i)
  })
})
