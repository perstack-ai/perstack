import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getFilteredEnv, SAFE_ENV_VARS } from "./env-filter.js"

describe("getFilteredEnv", () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = { ...originalEnv }
  })
  afterEach(() => {
    process.env = originalEnv
  })
  it("should only include SAFE_ENV_VARS from process.env", () => {
    process.env.PATH = "/usr/bin"
    process.env.HOME = "/home/user"
    process.env.AWS_SECRET_ACCESS_KEY = "secret123"
    process.env.GITHUB_TOKEN = "ghp_token"
    const result = getFilteredEnv()
    expect(result.PATH).toBe("/usr/bin")
    expect(result.HOME).toBe("/home/user")
    expect(result.AWS_SECRET_ACCESS_KEY).toBeUndefined()
    expect(result.GITHUB_TOKEN).toBeUndefined()
  })
  it("should include proxy environment variables", () => {
    process.env.HTTP_PROXY = "http://proxy:8080"
    process.env.HTTPS_PROXY = "https://proxy:8443"
    process.env.NO_PROXY = "localhost"
    const result = getFilteredEnv()
    expect(result.HTTP_PROXY).toBe("http://proxy:8080")
    expect(result.HTTPS_PROXY).toBe("https://proxy:8443")
    expect(result.NO_PROXY).toBe("localhost")
  })
  it("should merge additional env vars", () => {
    process.env.PATH = "/usr/bin"
    const result = getFilteredEnv({ CUSTOM_VAR: "value", ANTHROPIC_API_KEY: "sk-ant-xxx" })
    expect(result.PATH).toBe("/usr/bin")
    expect(result.CUSTOM_VAR).toBe("value")
    expect(result.ANTHROPIC_API_KEY).toBe("sk-ant-xxx")
  })
  it("should not allow additional to override protected env vars", () => {
    process.env.PATH = "/usr/bin"
    process.env.HOME = "/home/user"
    process.env.NODE_PATH = "/usr/lib/node"
    const result = getFilteredEnv({
      PATH: "/malicious/bin",
      HOME: "/attacker",
      NODE_PATH: "/evil/node",
    })
    expect(result.PATH).toBe("/usr/bin")
    expect(result.HOME).toBe("/home/user")
    expect(result.NODE_PATH).toBe("/usr/lib/node")
  })
  it("should block library injection variables", () => {
    const result = getFilteredEnv({
      LD_PRELOAD: "/attacker/lib.so",
      LD_LIBRARY_PATH: "/attacker/lib",
      DYLD_INSERT_LIBRARIES: "/attacker/dylib",
      NODE_OPTIONS: "--require /attacker/hook.js",
      PYTHONPATH: "/attacker/python",
    })
    expect(result.LD_PRELOAD).toBeUndefined()
    expect(result.LD_LIBRARY_PATH).toBeUndefined()
    expect(result.DYLD_INSERT_LIBRARIES).toBeUndefined()
    expect(result.NODE_OPTIONS).toBeUndefined()
    expect(result.PYTHONPATH).toBeUndefined()
  })
  it("should block protected vars case-insensitively", () => {
    const result = getFilteredEnv({
      path: "/malicious/bin",
      Path: "/malicious/bin",
      ld_preload: "/attacker/lib.so",
      Ld_Preload: "/attacker/lib.so",
      node_options: "--require /attacker/hook.js",
    })
    expect(result.path).toBeUndefined()
    expect(result.Path).toBeUndefined()
    expect(result.ld_preload).toBeUndefined()
    expect(result.Ld_Preload).toBeUndefined()
    expect(result.node_options).toBeUndefined()
  })
  it("should allow additional to add non-protected vars", () => {
    const result = getFilteredEnv({ MY_API_KEY: "secret", CUSTOM_CONFIG: "value" })
    expect(result.MY_API_KEY).toBe("secret")
    expect(result.CUSTOM_CONFIG).toBe("value")
  })
  it("should not leak sensitive API keys", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-secret"
    process.env.OPENAI_API_KEY = "sk-openai-secret"
    process.env.AWS_SECRET_ACCESS_KEY = "aws-secret"
    process.env.DATABASE_URL = "postgres://user:pass@host/db"
    const result = getFilteredEnv()
    expect(result.ANTHROPIC_API_KEY).toBeUndefined()
    expect(result.OPENAI_API_KEY).toBeUndefined()
    expect(result.AWS_SECRET_ACCESS_KEY).toBeUndefined()
    expect(result.DATABASE_URL).toBeUndefined()
  })
})
describe("SAFE_ENV_VARS", () => {
  it("should include essential system variables", () => {
    expect(SAFE_ENV_VARS).toContain("PATH")
    expect(SAFE_ENV_VARS).toContain("HOME")
    expect(SAFE_ENV_VARS).toContain("SHELL")
  })
  it("should include proxy variables", () => {
    expect(SAFE_ENV_VARS).toContain("HTTP_PROXY")
    expect(SAFE_ENV_VARS).toContain("HTTPS_PROXY")
    expect(SAFE_ENV_VARS).toContain("NO_PROXY")
    expect(SAFE_ENV_VARS).toContain("PERSTACK_PROXY_URL")
  })
  it("should NOT include any API key or secret patterns", () => {
    for (const envVar of SAFE_ENV_VARS) {
      expect(envVar).not.toMatch(/api.?key/i)
      expect(envVar).not.toMatch(/secret/i)
      expect(envVar).not.toMatch(/token/i)
      expect(envVar).not.toMatch(/password/i)
    }
  })
})

