import type { Expert, RunSetting } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { setupExperts } from "./setup-experts.js"

describe("@perstack/runtime: setupExperts", () => {
  const baseExpert: Expert = {
    key: "test-expert",
    name: "test-expert",
    version: "1.0.0",
    instruction: "Test instruction",
    skills: {},
    delegates: [],
    tags: [],
  }

  const baseSetting: RunSetting = {
    runId: "run-123",
    model: "claude-sonnet-4-20250514",
    providerConfig: { providerName: "anthropic", apiKey: "test-key" },
    expertKey: "test-expert",
    input: { text: "hello" },
    experts: {},
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
    startedAt: 1000,
    updatedAt: 2000,
    perstackApiBaseUrl: "https://api.perstack.dev",
    env: {},
  }

  it("resolves expert and returns experts map", async () => {
    const mockResolve = vi.fn().mockResolvedValue(baseExpert)
    const result = await setupExperts(baseSetting, mockResolve)
    expect(result.expertToRun).toEqual(baseExpert)
    expect(result.experts).toEqual({})
    expect(mockResolve).toHaveBeenCalledWith(
      "test-expert",
      {},
      {
        perstackApiBaseUrl: "https://api.perstack.dev",
        perstackApiKey: undefined,
      },
    )
  })

  it("copies experts from setting", async () => {
    const existingExpert: Expert = { ...baseExpert, key: "existing", name: "existing" }
    const settingWithExperts = {
      ...baseSetting,
      experts: { existing: existingExpert },
    }
    const mockResolve = vi.fn().mockResolvedValue(baseExpert)
    const result = await setupExperts(settingWithExperts, mockResolve)
    expect(result.experts).toEqual({ existing: existingExpert })
    expect(result.experts).not.toBe(settingWithExperts.experts)
  })

  it("resolves all delegates", async () => {
    const expertWithDelegates: Expert = {
      ...baseExpert,
      delegates: ["delegate-1", "delegate-2"],
    }
    const delegateExpert: Expert = { ...baseExpert, key: "delegate", name: "delegate" }
    const mockResolve = vi
      .fn()
      .mockResolvedValueOnce(expertWithDelegates)
      .mockResolvedValueOnce(delegateExpert)
      .mockResolvedValueOnce(delegateExpert)
    await setupExperts(baseSetting, mockResolve)
    expect(mockResolve).toHaveBeenCalledTimes(3)
    expect(mockResolve).toHaveBeenNthCalledWith(2, "delegate-1", {}, expect.any(Object))
    expect(mockResolve).toHaveBeenNthCalledWith(3, "delegate-2", {}, expect.any(Object))
  })

  it("throws when delegate resolution returns falsy", async () => {
    const expertWithDelegates: Expert = {
      ...baseExpert,
      delegates: ["missing-delegate"],
    }
    const mockResolve = vi
      .fn()
      .mockResolvedValueOnce(expertWithDelegates)
      .mockResolvedValueOnce(null)
    await expect(setupExperts(baseSetting, mockResolve)).rejects.toThrow(
      "Delegate missing-delegate not found",
    )
  })

  it("passes perstackApiKey when provided", async () => {
    const settingWithKey = {
      ...baseSetting,
      perstackApiKey: "my-api-key",
    }
    const mockResolve = vi.fn().mockResolvedValue(baseExpert)
    await setupExperts(settingWithKey, mockResolve)
    expect(mockResolve).toHaveBeenCalledWith(
      "test-expert",
      {},
      {
        perstackApiBaseUrl: "https://api.perstack.dev",
        perstackApiKey: "my-api-key",
      },
    )
  })
})
