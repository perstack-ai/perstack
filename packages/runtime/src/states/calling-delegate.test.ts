import type { Checkpoint } from "@perstack/core"
import { describe, expect, it } from "vitest"

type StopRunByDelegateResult = {
  type: "stopRunByDelegate"
  checkpoint: Checkpoint
}
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"
import type { BaseSkillManager } from "../skill-manager/index.js"

describe("@perstack/runtime: StateMachineLogic['CallingDelegate']", () => {
  it("processes delegate call correctly", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/math-expert",
          toolName: "@perstack/math-expert",
          args: { query: "Calculate 2 + 2" },
        },
      ],
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
      } as unknown as BaseSkillManager,
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
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
        status: "stoppedByDelegate",
        delegateTo: [
          {
            expert: {
              key: "@perstack/math-expert",
              name: "@perstack/math-expert",
              version: "1.0.0",
            },
            toolCallId: "tc_123",
            toolName: "@perstack/math-expert",
            query: "Calculate 2 + 2",
          },
        ],
        pendingToolCalls: undefined,
        partialToolResults: undefined,
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
      pendingToolCalls: undefined,
    })
    await expect(
      StateMachineLogics.CallingDelegate({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No pending tool calls found")
  })

  it("throws error when skill manager missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/math-expert",
          toolName: "@perstack/math-expert",
          args: { query: "Calculate 2 + 2" },
        },
      ],
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
      } as unknown as BaseSkillManager,
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
      pendingToolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/math-expert",
          toolName: "@perstack/math-expert",
          args: { query: undefined },
        },
      ],
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
      } as unknown as BaseSkillManager,
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

  it("collects multiple delegate calls", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        {
          id: "tc_1",
          skillName: "@perstack/math-expert",
          toolName: "@perstack/math-expert",
          args: { query: "Calculate 2 + 2" },
        },
        {
          id: "tc_2",
          skillName: "@perstack/text-expert",
          toolName: "@perstack/text-expert",
          args: { query: "Reverse hello" },
        },
      ],
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
      } as unknown as BaseSkillManager,
      "@perstack/text-expert": {
        name: "@perstack/text-expert",
        type: "delegate" as const,
        _toolDefinitions: [],
        _initialized: true,
        expert: {
          key: "@perstack/text-expert",
          name: "@perstack/text-expert",
          version: "1.0.0",
        },
        init: async () => {},
        getToolDefinitions: async () => [
          { name: "@perstack/text-expert", description: "Text processing" },
        ],
        callTool: async () => {},
        close: async () => {},
      } as unknown as BaseSkillManager,
    }
    const result = (await StateMachineLogics.CallingDelegate({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
    })) as StopRunByDelegateResult
    expect(result.type).toBe("stopRunByDelegate")
    expect(result.checkpoint.delegateTo).toHaveLength(2)
    expect(result.checkpoint.delegateTo).toEqual([
      {
        expert: {
          key: "@perstack/math-expert",
          name: "@perstack/math-expert",
          version: "1.0.0",
        },
        toolCallId: "tc_1",
        toolName: "@perstack/math-expert",
        query: "Calculate 2 + 2",
      },
      {
        expert: {
          key: "@perstack/text-expert",
          name: "@perstack/text-expert",
          version: "1.0.0",
        },
        toolCallId: "tc_2",
        toolName: "@perstack/text-expert",
        query: "Reverse hello",
      },
    ])
    expect(result.checkpoint.pendingToolCalls).toBeUndefined()
  })

  it("keeps non-delegate tool calls in pendingToolCalls", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        {
          id: "tc_1",
          skillName: "@perstack/math-expert",
          toolName: "@perstack/math-expert",
          args: { query: "Calculate 2 + 2" },
        },
        {
          id: "tc_2",
          skillName: "@perstack/base",
          toolName: "readFile",
          args: { path: "/tmp/test.txt" },
        },
      ],
      partialToolResults: [
        {
          id: "tr_1",
          skillName: "@perstack/base",
          toolName: "think",
          result: [{ type: "textPart", id: "p1", text: "thinking..." }],
        },
      ],
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
      } as unknown as BaseSkillManager,
      "@perstack/base": {
        name: "@perstack/base",
        type: "mcp" as const,
        _toolDefinitions: [],
        _initialized: true,
        init: async () => {},
        getToolDefinitions: async () => [{ name: "readFile", description: "Read file" }],
        callTool: async () => {},
        close: async () => {},
      } as unknown as BaseSkillManager,
    }
    const result = (await StateMachineLogics.CallingDelegate({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
    })) as StopRunByDelegateResult
    expect(result.type).toBe("stopRunByDelegate")
    expect(result.checkpoint.delegateTo).toHaveLength(1)
    expect(result.checkpoint.pendingToolCalls).toHaveLength(1)
    expect(result.checkpoint.pendingToolCalls?.[0].id).toBe("tc_2")
    expect(result.checkpoint.partialToolResults).toEqual(step.partialToolResults)
  })
})
