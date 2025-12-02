import { describe, expect, it } from "vitest"
import { run } from "./runtime.js"

describe("@perstack/runtime: run", () => {
  it("throws error for invalid workspace path", async () => {
    const invalidInput = {
      setting: {
        runId: "test-run",
        expertKey: "test-expert",
        experts: {
          "test-expert": {
            key: "test-expert",
            name: "test-expert",
            version: "1.0.0",
            instruction: "Test",
            skills: {},
            delegates: [],
            tags: [],
          },
        },
        input: { text: "Hello" },
        model: "claude-sonnet-4-20250514",
        providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
        temperature: 0.7,
        maxSteps: 10,
        maxRetries: 3,
        timeout: 30000,
        workspace: "relative/path",
      },
    }
    await expect(run(invalidInput)).rejects.toThrow("Workspace path must be absolute")
  })
})
