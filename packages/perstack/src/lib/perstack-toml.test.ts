import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getPerstackConfig } from "./perstack-toml.js"

describe("getPerstackConfig with remote URL", () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    vi.resetAllMocks()
  })
  afterEach(() => {
    global.fetch = originalFetch
  })
  it("should fetch config from raw.githubusercontent.com with redirect disabled", async () => {
    const mockToml = `
[experts."test-expert"]
instruction = "Test instruction"
`
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockToml),
    })
    const config = await getPerstackConfig(
      "https://raw.githubusercontent.com/owner/repo/main/perstack.toml",
    )
    expect(global.fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/owner/repo/main/perstack.toml",
      { redirect: "error" },
    )
    expect(config.experts?.["test-expert"]).toBeDefined()
    expect(config.experts?.["test-expert"]?.instruction).toBe("Test instruction")
  })
  it("should reject URLs from disallowed domains", async () => {
    await expect(getPerstackConfig("https://example.com/perstack.toml")).rejects.toThrow(
      "Remote config only allowed from: raw.githubusercontent.com",
    )
  })
  it("should treat http URLs as local paths (not remote)", async () => {
    await expect(getPerstackConfig("http://malicious.com/perstack.toml")).rejects.toThrow(
      'Given config path "http://malicious.com/perstack.toml" is not found',
    )
  })
  it("should throw error when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })
    await expect(
      getPerstackConfig("https://raw.githubusercontent.com/owner/repo/main/perstack.toml"),
    ).rejects.toThrow("Failed to fetch config: 404 Not Found")
  })
})
