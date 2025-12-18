import { vol } from "memfs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resolveRunContext } from "./context.js"

vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs")
  return memfs.fs.promises
})

describe("@perstack/runtime: resolveRunContext", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vol.reset()
    vi.spyOn(process, "cwd").mockReturnValue("/test")

    // Clear process.env
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    // Set required API key
    process.env.ANTHROPIC_API_KEY = "test-api-key"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original env
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  it("resolves context with minimal config", async () => {
    const tomlContent = `
[experts.test]
description = "Test expert"
instruction = "Do testing"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.perstackConfig).toBeDefined()
    expect(context.env).toBeDefined()
    expect(context.providerConfig).toBeDefined()
    expect(context.model).toBeDefined()
    expect(context.experts).toBeDefined()
  })

  it("uses default provider and model", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.providerConfig.providerName).toBe("anthropic")
    expect(context.model).toBe("claude-sonnet-4-5")
  })

  it("uses provider from input", async () => {
    process.env.OPENAI_API_KEY = "openai-key"

    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({ provider: "openai" })

    expect(context.providerConfig.providerName).toBe("openai")
  })

  it("uses model from input", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({ model: "claude-opus-4" })

    expect(context.model).toBe("claude-opus-4")
  })

  it("uses provider from perstack.toml", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-key"

    const tomlContent = `
[provider]
providerName = "google"

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.providerConfig.providerName).toBe("google")
  })

  it("uses model from perstack.toml", async () => {
    const tomlContent = `
model = "claude-opus-4"

[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.model).toBe("claude-opus-4")
  })

  it("populates experts with key, name, and version", async () => {
    const tomlContent = `
[experts.my-expert]
description = "My expert"
instruction = "Do stuff"
version = "2.0.0"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.experts["my-expert"]).toBeDefined()
    expect(context.experts["my-expert"].key).toBe("my-expert")
    expect(context.experts["my-expert"].name).toBe("my-expert")
    expect(context.experts["my-expert"].version).toBe("2.0.0")
  })

  it("defaults version to 1.0.0", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.experts.test.version).toBe("1.0.0")
  })

  it("includes expert skills and delegates", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
delegates = ["other-expert"]

[experts.test.skills.base]
type = "mcpStdioSkill"
command = "npx"
packageName = "@perstack/base"
`
    vol.fromJSON({
      "/test/perstack.toml": tomlContent,
    })

    const context = await resolveRunContext({})

    expect(context.experts.test.skills).toBeDefined()
    expect(context.experts.test.delegates).toEqual(["other-expert"])
  })
})
