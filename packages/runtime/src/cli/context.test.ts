import { vol } from "memfs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock fs/promises with memfs
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs")
  return memfs.fs.promises
})

import { resolveRunContext } from "./context.js"

describe("@perstack/runtime: resolveRunContext", () => {
  beforeEach(() => {
    vol.reset()
  })

  afterEach(() => {
    vol.reset()
    vi.restoreAllMocks()
  })

  it("loads config and returns run context", async () => {
    const tomlContent = `
[experts.test-expert]
description = "Test expert"
instruction = "Test instruction"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
        ".env": "ANTHROPIC_API_KEY=test-key",
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({})
    expect(context.perstackConfig).toBeDefined()
    expect(context.experts).toBeDefined()
    expect(context.experts["test-expert"]).toBeDefined()

    delete process.env.ANTHROPIC_API_KEY
  })

  it("uses default provider when not specified", async () => {
    const tomlContent = `
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
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({})
    expect(context.providerConfig.providerName).toBe("anthropic")

    delete process.env.ANTHROPIC_API_KEY
  })

  it("uses default model when not specified", async () => {
    const tomlContent = `
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
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({})
    expect(context.model).toBe("claude-sonnet-4-5")

    delete process.env.ANTHROPIC_API_KEY
  })

  it("uses custom config path when provided", async () => {
    const tomlContent = `
[experts.custom]
description = "Custom"
instruction = "Custom"
`
    vol.fromJSON(
      {
        "custom/config.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({ configPath: "custom/config.toml" })
    expect(context.experts["custom"]).toBeDefined()

    delete process.env.ANTHROPIC_API_KEY
  })

  it("uses provided provider over config", async () => {
    const tomlContent = `
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
    process.env.OPENAI_API_KEY = "openai-key"

    const context = await resolveRunContext({ provider: "openai" })
    expect(context.providerConfig.providerName).toBe("openai")

    delete process.env.OPENAI_API_KEY
  })

  it("uses provided model over config", async () => {
    const tomlContent = `
model = "claude-sonnet-4-5"

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
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({ model: "claude-opus-4" })
    expect(context.model).toBe("claude-opus-4")

    delete process.env.ANTHROPIC_API_KEY
  })

  it("includes expert metadata in context", async () => {
    const tomlContent = `
[experts.test-expert]
description = "Test description"
instruction = "Test instruction"
version = "2.0.0"
tags = ["tag1", "tag2"]
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({})
    const expert = context.experts["test-expert"]
    expect(expert.key).toBe("test-expert")
    expect(expert.name).toBe("test-expert")
    expect(expert.version).toBe("2.0.0")
    expect(expert.description).toBe("Test description")
    expect(expert.tags).toEqual(["tag1", "tag2"])

    delete process.env.ANTHROPIC_API_KEY
  })

  it("defaults expert version to 1.0.0", async () => {
    const tomlContent = `
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
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({})
    expect(context.experts.test.version).toBe("1.0.0")

    delete process.env.ANTHROPIC_API_KEY
  })

  it("uses custom envPath when provided", async () => {
    const tomlContent = `
[experts.test]
description = "Test"
instruction = "Test"
`
    vol.fromJSON(
      {
        "perstack.toml": tomlContent,
        "custom.env": "ANTHROPIC_API_KEY=custom-key",
      },
      "/test",
    )
    vi.spyOn(process, "cwd").mockReturnValue("/test")
    process.env.ANTHROPIC_API_KEY = "test-key"

    const context = await resolveRunContext({ envPath: ["custom.env"] })
    expect(context.env).toBeDefined()

    delete process.env.ANTHROPIC_API_KEY
  })
})
