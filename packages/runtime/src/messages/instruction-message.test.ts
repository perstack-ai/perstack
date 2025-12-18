import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { createInstructionMessage } from "./instruction-message.js"

function createExpert(overrides: Partial<Expert> = {}): Expert {
  return {
    key: "test-expert",
    name: "@test/expert",
    version: "1.0.0",
    description: "Test expert",
    instruction: "Test instruction",
    skills: {},
    delegates: [],
    tags: [],
    ...overrides,
  }
}

describe("@perstack/runtime: createInstructionMessage", () => {
  const startedAt = Date.now()

  it("returns instruction message with correct type", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.type).toBe("instructionMessage")
  })

  it("includes message id", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.id).toBeDefined()
    expect(typeof message.id).toBe("string")
  })

  it("sets cache to true", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.cache).toBe(true)
  })

  it("includes expert instruction in message contents", () => {
    const expert = createExpert({ instruction: "Custom instruction content" })
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents).toHaveLength(1)
    expect(message.contents[0].type).toBe("textPart")
    expect(message.contents[0].text).toContain("Custom instruction content")
  })

  it("includes meta instruction about agent loop", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toContain("agent loop")
    expect(message.contents[0].text).toContain("attemptCompletion")
  })

  it("includes current time information", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    const expectedDate = new Date(startedAt).toISOString()
    expect(message.contents[0].text).toContain(expectedDate)
  })

  it("includes current working directory", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toContain(process.cwd())
  })

  it("includes skill rules when skills have rules", () => {
    const expert = createExpert({
      skills: {
        "test-skill": {
          type: "mcpStdioSkill",
          name: "test-skill",
          command: "npx",
          args: ["test"],
          requiredEnv: [],
          pick: [],
          omit: [],
          rule: "Use this skill carefully",
        },
      },
    })
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toContain("test-skill")
    expect(message.contents[0].text).toContain("Use this skill carefully")
  })

  it("includes delegate expert descriptions", () => {
    const expert = createExpert({
      delegates: ["@test/delegate"],
    })
    const experts = {
      "@test/delegate": createExpert({
        name: "@test/delegate",
        description: "Delegate expert description",
      }),
    }
    const message = createInstructionMessage(expert, experts, startedAt)
    expect(message.contents[0].text).toContain("@test/delegate")
    expect(message.contents[0].text).toContain("Delegate expert description")
  })

  it("handles missing delegate experts gracefully", () => {
    const expert = createExpert({
      delegates: ["@test/nonexistent"],
    })
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toBeDefined()
  })

  it("includes Perstack identity in instruction", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toContain("You are Perstack")
  })

  it("describes conditions for ending agent loop", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].text).toContain("Conditions for ending the agent loop")
    expect(message.contents[0].text).toContain("task is complete")
  })

  it("content part has id", () => {
    const expert = createExpert()
    const message = createInstructionMessage(expert, {}, startedAt)
    expect(message.contents[0].id).toBeDefined()
    expect(typeof message.contents[0].id).toBe("string")
  })
})
