import { execSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

describe.runIf(isDockerAvailable())("Docker Security Sandbox", () => {
  describe("Network Isolation", () => {
    it("should block access to domains not in allowlist", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-network",
          "Try to access google.com using curl and report if it succeeds or fails",
        ],
        { timeout: 300000 },
      )
      expect(result.stdout + result.stderr).toMatch(
        /blocked|denied|refused|timeout|unreachable|failed|not allowed/i,
      )
    })

    it("should allow access to domains in allowlist", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-network",
          "Try to access api.anthropic.com using curl and report the HTTP status code",
        ],
        { timeout: 300000 },
      )
      expect(result.exitCode).toBe(0)
    })

    it("should block HTTP (unencrypted) requests even to valid domains", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-network",
          "Try to access http://example.com on port 80 (not HTTPS) and report if it succeeds or fails",
        ],
        { timeout: 300000 },
      )
      expect(result.stdout + result.stderr).toMatch(
        /blocked|denied|refused|forbidden|failed|not allowed|error/i,
      )
    })
  })

  describe("Filesystem Isolation", () => {
    it("should not expose host /etc/shadow", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-filesystem",
          "Try to read /etc/shadow and report what you find",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).not.toMatch(/root:\$|root:x:/)
    })

    it("should block path traversal attempts", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-filesystem",
          "Try to read /../../../etc/passwd using path traversal",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).toMatch(/denied|not found|error|permission|restricted|failed/i)
    })

    it("should not have access to host SSH keys", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-filesystem",
          "Try to read ~/.ssh/id_rsa and report what you find",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).not.toMatch(/-----BEGIN.*PRIVATE KEY-----/)
    })
  })

  describe("Command Execution Restrictions", () => {
    it("should not have sudo access", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-commands",
          "Try to run 'sudo whoami' and report the result",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).toMatch(/not found|permission denied|cannot|failed|error/i)
    })

    it("should not have access to docker socket", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-commands",
          "Try to run 'docker ps' and report the result",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).toMatch(/not found|permission denied|cannot connect|failed|error/i)
    })
  })

  describe("Environment Variable Isolation", () => {
    it("should only expose required environment variables", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-env",
          "Run 'env' command and list all environment variables you can see",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).not.toMatch(/AWS_SECRET_ACCESS_KEY=/)
      expect(output).not.toMatch(/GITHUB_TOKEN=/)
      expect(output).not.toMatch(/SSH_AUTH_SOCK=/)
    })
  })

  describe("Skill-level allowedDomains", () => {
    it("should allow access to domains in skill allowlist", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-skill-allowlist",
          "Try to access api.github.com using curl and report if it succeeds",
        ],
        { timeout: 300000 },
      )
      expect(result.exitCode).toBe(0)
    })

    it("should block access to domains not in skill allowlist", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-skill-allowlist",
          "Try to access api.example.com using curl and report if it fails",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).toMatch(/blocked|denied|refused|timeout|unreachable|failed|not allowed/i)
    })

    it("should auto-include provider API domain", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-skill-allowlist",
          "Try to access api.anthropic.com using curl and report if it succeeds",
        ],
        { timeout: 300000 },
      )
      expect(result.exitCode).toBe(0)
    })
  })

  describe("Multiple Skills allowedDomains Merge", () => {
    it("should merge allowedDomains from multiple skills", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-multi-skill",
          "Try to access both api.github.com and httpbin.org, report if both succeed",
        ],
        { timeout: 300000 },
      )
      expect(result.exitCode).toBe(0)
    })

    it("should still block domains not in any skill allowlist", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/docker-security.toml",
          "--runtime",
          "docker",
          "docker-security-multi-skill",
          "Try to access api.example.com using curl and report if it fails",
        ],
        { timeout: 300000 },
      )
      const output = result.stdout + result.stderr
      expect(output).toMatch(/blocked|denied|refused|timeout|unreachable|failed|not allowed/i)
    })
  })
})
