import { vol } from "memfs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getPerstackConfig } from "./perstack-toml.js"

vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs")
  return memfs.fs.promises
})

describe("@perstack/runtime: getPerstackConfig", () => {
  beforeEach(() => {
    vol.reset()
    vi.spyOn(process, "cwd").mockReturnValue("/test")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("parses valid perstack.toml from specified path", async () => {
    const tomlContent = `
[experts.test]
description = "Test expert"
instruction = "Do testing"
`
    vol.fromJSON({
      "/test/custom.toml": tomlContent,
    })

    const config = await getPerstackConfig("custom.toml")

    expect(config.experts?.test).toBeDefined()
    expect(config.experts?.test?.description).toBe("Test expert")
    expect(config.experts?.test?.instruction).toBe("Do testing")
  })

  it("finds perstack.toml in current directory", async () => {
    const tomlContent = `
[experts.main]
description = "Main expert"
instruction = "Main instruction"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const config = await getPerstackConfig()

    expect(config.experts?.main).toBeDefined()
  })

  it("throws when config path not found", async () => {
    vol.fromJSON({})

    await expect(getPerstackConfig("nonexistent.toml")).rejects.toThrow(
      'Given config path "nonexistent.toml" is not found',
    )
  })

  it("throws when perstack.toml not found anywhere", async () => {
    vol.fromJSON({})
    vi.spyOn(process, "cwd").mockReturnValue("/")

    await expect(getPerstackConfig()).rejects.toThrow(
      "perstack.toml not found. Create one or specify --config path.",
    )
  })

  it("parses skills configuration", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"

[experts.test.skills.base]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const config = await getPerstackConfig()

    expect(config.experts?.test?.skills?.base).toBeDefined()
    expect(config.experts?.test?.skills?.base?.type).toBe("mcpStdioSkill")
  })

  it("parses envPath configuration", async () => {
    const tomlContent = `
envPath = [".env.custom"]

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const config = await getPerstackConfig()

    expect(config.envPath).toEqual([".env.custom"])
  })

  it("parses provider configuration", async () => {
    const tomlContent = `
[provider]
providerName = "openai"

[provider.setting]
baseUrl = "https://custom.openai.com"

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const config = await getPerstackConfig()

    expect(config.provider?.providerName).toBe("openai")
    expect((config.provider?.setting as { baseUrl?: string })?.baseUrl).toBe(
      "https://custom.openai.com",
    )
  })

  describe("remote config", () => {
    it("rejects non-HTTPS URLs", async () => {
      await expect(getPerstackConfig("http://example.com/config.toml")).rejects.toThrow(
        "Remote config requires HTTPS",
      )
    })

    it("rejects disallowed hosts", async () => {
      await expect(getPerstackConfig("https://example.com/config.toml")).rejects.toThrow(
        "Remote config only allowed from:",
      )
    })
  })
})
