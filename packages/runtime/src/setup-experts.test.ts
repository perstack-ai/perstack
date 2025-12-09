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
    jobId: "job-123",
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
    expect(result.experts).toEqual({ "test-expert": baseExpert })
    expect(mockResolve).toHaveBeenCalledWith("test-expert", expect.any(Object), {
      perstackApiBaseUrl: "https://api.perstack.dev",
      perstackApiKey: undefined,
    })
  })

  it("copies experts from setting and does not mutate original", async () => {
    const existingExpert: Expert = { ...baseExpert, key: "existing", name: "existing" }
    const settingWithExperts = {
      ...baseSetting,
      experts: { existing: existingExpert },
    }
    const mockResolve = vi.fn().mockResolvedValue(baseExpert)
    const result = await setupExperts(settingWithExperts, mockResolve)
    expect(result.experts).toEqual({ existing: existingExpert, "test-expert": baseExpert })
    expect(result.experts).not.toBe(settingWithExperts.experts)
    expect(settingWithExperts.experts).toEqual({ existing: existingExpert })
  })

  it("resolves all delegates and adds them to experts map", async () => {
    const expertWithDelegates: Expert = {
      ...baseExpert,
      delegates: ["delegate-1", "delegate-2"],
    }
    const delegateExpert1: Expert = { ...baseExpert, key: "delegate-1", name: "delegate-1" }
    const delegateExpert2: Expert = { ...baseExpert, key: "delegate-2", name: "delegate-2" }
    const mockResolve = vi
      .fn()
      .mockResolvedValueOnce(expertWithDelegates)
      .mockResolvedValueOnce(delegateExpert1)
      .mockResolvedValueOnce(delegateExpert2)
    const result = await setupExperts(baseSetting, mockResolve)
    expect(mockResolve).toHaveBeenCalledTimes(3)
    expect(result.experts["delegate-1"]).toEqual(delegateExpert1)
    expect(result.experts["delegate-2"]).toEqual(delegateExpert2)
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
    expect(mockResolve).toHaveBeenCalledWith("test-expert", expect.any(Object), {
      perstackApiBaseUrl: "https://api.perstack.dev",
      perstackApiKey: "my-api-key",
    })
  })
})
