import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"
import type { SkillManager } from "../skill-manager.js"

describe("@perstack/runtime: StateMachineLogic['CallingDelegate']", () => {
  it("processes delegate call correctly", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/math-expert",
        toolName: "@perstack/math-expert",
        args: { query: "Calculate 2 + 2" },
      },
    })
    const skillManagers = {
      "@perstack/math-expert": {
        name: "@perstack/math-expert",
        type: "delegate" as const,
        _toolDefinitions: [],
        _initialized: true,
        expert: {
          key: "@perstack/math-expert",
          name: "@perstack/math-expert",
          version: "1.0.0",
        },
        init: async () => {},
        getToolDefinitions: async () => [
          { name: "@perstack/math-expert", description: "Math calculations" },
        ],
        callTool: async () => {},
        close: async () => {},
      } as unknown as SkillManager,
    }
    await expect(
      StateMachineLogics.CallingDelegate({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
      }),
    ).resolves.toStrictEqual({
      type: "stopRunByDelegate",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
        status: "stoppedByDelegate",
        delegateTo: {
          expert: {
            key: "@perstack/math-expert",
            name: "@perstack/math-expert",
            version: "1.0.0",
          },
          toolCallId: "tc_123",
          toolName: "@perstack/math-expert",
          query: "Calculate 2 + 2",
        },
      },
      step: {
        ...step,
        finishedAt: expect.any(Number),
      },
    })
  })

  it("throws error when tool call missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: undefined,
    })
    await expect(
      StateMachineLogics.CallingDelegate({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No tool call found")
  })

  it("throws error when skill manager missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/math-expert",
        toolName: "@perstack/math-expert",
        args: { query: "Calculate 2 + 2" },
      },
    })
    const skillManagers = {
      "@perstack/math-expert": {
        name: "@perstack/math-expert",
        type: "delegate" as const,
        _toolDefinitions: [],
        _initialized: true,
        expert: undefined,
        init: async () => {},
        getToolDefinitions: async () => [
          { name: "@perstack/math-expert", description: "Math calculations" },
        ],
        callTool: async () => {},
        close: async () => {},
      } as unknown as SkillManager,
    }
    await expect(
      StateMachineLogics.CallingDelegate({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
      }),
    ).rejects.toThrow('Delegation error: skill manager "@perstack/math-expert" not found')
  })

  it("throws error when query is undefined", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/math-expert",
        toolName: "@perstack/math-expert",
        args: { query: undefined },
      },
    })
    const skillManagers = {
      "@perstack/math-expert": {
        name: "@perstack/math-expert",
        type: "delegate" as const,
        _toolDefinitions: [],
        _initialized: true,
        expert: {
          key: "@perstack/math-expert",
          name: "@perstack/math-expert",
          version: "1.0.0",
        },
        init: async () => {},
        getToolDefinitions: async () => [
          { name: "@perstack/math-expert", description: "Math calculations" },
        ],
        callTool: async () => {},
        close: async () => {},
      } as unknown as SkillManager,
    }
    await expect(
      StateMachineLogics.CallingDelegate({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
      }),
    ).rejects.toThrow("Delegation error: query is undefined")
  })
})
