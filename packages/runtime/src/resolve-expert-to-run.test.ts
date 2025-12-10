import type { Expert } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { resolveExpertToRun } from "./resolve-expert-to-run.js"

vi.mock("@perstack/api-client/v1", () => ({
  ApiV1Client: class {
    registry = {
      experts: {
        get: async () => ({
          expert: {
            key: "remote-expert",
            name: "Remote Expert",
            version: "1.0.0",
            description: "A remote expert",
            instruction: "Remote expert instruction",
            skills: {
              "@perstack/base": {
                type: "mcpStdioSkill",
                description: "Base skill",
                command: "npx",
                packageName: "@perstack/base",
                requiredEnv: [],
                pick: [],
                omit: [],
                lazyInit: false,
              },
            },
            delegates: [],
            tags: [],
          },
        }),
      },
    }
  },
}))

function createTestExpert(overrides: Partial<Expert> = {}): Expert {
  return {
    key: "test-expert",
    name: "Test Expert",
    version: "1.0.0",
    description: "A test expert",
    instruction: "Test expert instruction",
    skills: {
      "@perstack/base": {
        type: "mcpStdioSkill",
        name: "@perstack/base",
        description: "Base skill",
        command: "npx",
        args: ["-y", "@perstack/base"],
        requiredEnv: [],
        pick: [],
        omit: [],
        lazyInit: false,
      },
    },
    delegates: [],
    tags: [],
    runtime: ["perstack"],
    ...overrides,
  }
}

describe("@perstack/runtime: resolveExpertToRun", () => {
  it("returns existing expert from experts record", async () => {
    const existingExpert = createTestExpert()
    const experts = { "test-expert": existingExpert }
    const result = await resolveExpertToRun("test-expert", experts, {
      perstackApiBaseUrl: "https://api.test.com",
    })
    expect(result).toBe(existingExpert)
  })

  it("fetches expert from API when not in local record", async () => {
    const experts: Record<string, Expert> = {}
    const result = await resolveExpertToRun("remote-expert", experts, {
      perstackApiBaseUrl: "https://api.test.com",
      perstackApiKey: "test-key",
    })
    expect(result.key).toBe("remote-expert")
    expect(result.name).toBe("Remote Expert")
  })

  it("adds name to skills when converting from API", async () => {
    const experts: Record<string, Expert> = {}
    const result = await resolveExpertToRun("remote-expert", experts, {
      perstackApiBaseUrl: "https://api.test.com",
    })
    expect(result.skills["@perstack/base"].name).toBe("@perstack/base")
  })

  it("does not mutate experts record", async () => {
    const experts: Record<string, Expert> = {}
    await resolveExpertToRun("remote-expert", experts, {
      perstackApiBaseUrl: "https://api.test.com",
    })
    expect(experts["remote-expert"]).toBeUndefined()
  })
})

