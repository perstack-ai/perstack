import { afterEach, describe, expect, it, vi } from "vitest"
import { getPerstackConfig } from "./perstack-toml.js"

describe("getPerstackConfig with remote URL", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it("should fetch config from raw.githubusercontent.com with redirect disabled", async () => {
    const mockToml = `
[experts."test-expert"]
instruction = "Test instruction"
`
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockToml),
    })
    vi.stubGlobal("fetch", mockFetch)
    const config = await getPerstackConfig(
      "https://raw.githubusercontent.com/owner/repo/main/perstack.toml",
    )
    expect(mockFetch).toHaveBeenCalledWith(
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
  it("should reject http URLs with clear error message", async () => {
    await expect(getPerstackConfig("http://example.com/perstack.toml")).rejects.toThrow(
      "Remote config requires HTTPS",
    )
  })
  it("should throw error when fetch fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })
    vi.stubGlobal("fetch", mockFetch)
    await expect(
      getPerstackConfig("https://raw.githubusercontent.com/owner/repo/main/perstack.toml"),
    ).rejects.toThrow("Failed to fetch remote config: 404 Not Found")
  })
  it("should throw friendly error for network failures", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"))
    vi.stubGlobal("fetch", mockFetch)
    await expect(
      getPerstackConfig("https://raw.githubusercontent.com/owner/repo/main/perstack.toml"),
    ).rejects.toThrow("Failed to fetch remote config: Network error")
  })
  it("should handle uppercase URL schemes (case-insensitive)", async () => {
    await expect(getPerstackConfig("HTTPS://example.com/perstack.toml")).rejects.toThrow(
      "Remote config only allowed from: raw.githubusercontent.com",
    )
  })
  it("should reject uppercase HTTP URLs", async () => {
    await expect(getPerstackConfig("HTTP://example.com/perstack.toml")).rejects.toThrow(
      "Remote config requires HTTPS",
    )
  })
})
