import { vol } from "memfs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock fs/promises with memfs
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs")
  return memfs.fs.promises
})

import { getPerstackConfig } from "./perstack-toml.js"

describe("@perstack/runtime: getPerstackConfig", () => {
  beforeEach(() => {
    vol.reset()
  })

  afterEach(() => {
    vol.reset()
    vi.restoreAllMocks()
  })

  it("throws when config file not found and no path given", async () => {
    // Create a minimal directory structure without perstack.toml
    vol.fromJSON({}, "/test")
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    await expect(getPerstackConfig()).rejects.toThrow("perstack.toml not found")
  })

  it("throws when given config path does not exist", async () => {
    vol.fromJSON({}, "/test")

    await expect(getPerstackConfig("/nonexistent/perstack.toml")).rejects.toThrow(
      'Given config path "/nonexistent/perstack.toml" is not found',
    )
  })

  it("parses valid TOML config file", async () => {
    const tomlContent = `
[experts.test-expert]
description = "Test expert"
instruction = "Test instruction"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    const config = await getPerstackConfig()
    expect(config.experts).toBeDefined()
    expect(config.experts?.["test-expert"]).toBeDefined()
    expect(config.experts?.["test-expert"].description).toBe("Test expert")
  })

  it("loads config from specified path", async () => {
    const tomlContent = `
[experts.custom-expert]
description = "Custom expert"
instruction = "Custom instruction"
`
    vol.fromJSON(
      {
        "custom/config.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    const config = await getPerstackConfig("custom/config.toml")
    expect(config.experts?.["custom-expert"]).toBeDefined()
  })

  it("searches parent directories for perstack.toml", async () => {
    const tomlContent = `
[experts.parent-expert]
description = "Parent expert"
instruction = "Parent instruction"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
        "subdir/.gitkeep": "",
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test/subdir")

    const config = await getPerstackConfig()
    expect(config.experts?.["parent-expert"]).toBeDefined()
  })

  it("rejects HTTP URLs for remote config", async () => {
    await expect(getPerstackConfig("http://example.com/config.toml")).rejects.toThrow(
      "Remote config requires HTTPS",
    )
  })

  it("rejects non-allowed hosts for remote config", async () => {
    await expect(getPerstackConfig("https://evil.com/config.toml")).rejects.toThrow(
      "Remote config only allowed from",
    )
  })

  it("parses config with provider settings", async () => {
    const tomlContent = `
model = "claude-sonnet-4-5"

[provider]
providerName = "anthropic"

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    const config = await getPerstackConfig()
    expect(config.model).toBe("claude-sonnet-4-5")
  })

  it("parses config with envPath array", async () => {
    const tomlContent = `
envPath = [".env", ".env.local"]

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    const config = await getPerstackConfig()
    expect(config.envPath).toEqual([".env", ".env.local"])
  })

  it("parses config with skills", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"

[experts.test.skills.base]
type = "mcpStdioSkill"
name = "@perstack/base"
command = "npx"
args = ["@perstack/base"]
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    const config = await getPerstackConfig()
    expect(config.experts?.test.skills?.base).toBeDefined()
  })
})
