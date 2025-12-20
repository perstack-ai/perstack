import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../../test/run-params.js"
import type { LLMExecutor } from "../../llm/index.js"
import { createMockLLMExecutor } from "../../llm/index.js"
import { StateMachineLogics } from "../index.js"

const mockLLMExecutor = createMockLLMExecutor() as unknown as LLMExecutor

describe("@perstack/runtime: StateMachineLogic['Init']", () => {
  it("initializes correctly", async () => {
    const setting = createRunSetting({
      input: { text: "How are you?" },
    })
    const checkpoint = createCheckpoint({
      status: "init",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).resolves.toStrictEqual({
      type: "startRun",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      initialCheckpoint: checkpoint,
      inputMessages: [
        {
          type: "instructionMessage",
          id: expect.any(String),
          contents: [{ type: "textPart", id: expect.any(String), text: expect.any(String) }],
          cache: true,
        },
        {
          type: "userMessage",
          id: expect.any(String),
          contents: [{ type: "textPart", id: expect.any(String), text: "How are you?" }],
        },
      ],
    })
  })

  it("throws error when input message is undefined", async () => {
    const setting = createRunSetting({
      input: { text: undefined },
    })
    const checkpoint = createCheckpoint({
      status: "init",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).rejects.toThrow("Input message is undefined")
  })

  it("resumes from stopped by delegate correctly", async () => {
    const setting = createRunSetting({
      input: {
        interactiveToolCallResult: {
          toolCallId: "123",
          toolName: "test",
          skillName: "test-skill",
          text: "test-delegate",
        },
      },
    })
    const checkpoint = createCheckpoint({
      status: "stoppedByDelegate",
    })
    const step = createStep()
    const event = await StateMachineLogics.Init({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("startRun")
    if (event.type === "startRun") {
      expect(event.inputMessages).toEqual([])
      expect(event.initialCheckpoint.partialToolResults).toHaveLength(1)
      expect(event.initialCheckpoint.partialToolResults?.[0].id).toBe("123")
      expect(event.initialCheckpoint.pendingToolCalls).toBeUndefined()
    }
  })

  it("throws error when delegate call result is undefined", async () => {
    const setting = createRunSetting({
      input: { interactiveToolCallResult: undefined },
    })
    const checkpoint = createCheckpoint({
      status: "stoppedByDelegate",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).rejects.toThrow("Interactive tool call result is undefined")
  })

  it("resumes from stopped by interactive tool correctly", async () => {
    const setting = createRunSetting({
      input: {
        interactiveToolCallResult: {
          toolCallId: "123",
          toolName: "test",
          skillName: "test-skill",
          text: "test-interactive-tool",
        },
      },
    })
    const checkpoint = createCheckpoint({
      status: "stoppedByInteractiveTool",
    })
    const step = createStep()
    const event = await StateMachineLogics.Init({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("startRun")
    if (event.type === "startRun") {
      expect(event.inputMessages).toEqual([])
      expect(event.initialCheckpoint.partialToolResults).toHaveLength(1)
      expect(event.initialCheckpoint.partialToolResults?.[0].id).toBe("123")
      expect(event.initialCheckpoint.pendingToolCalls).toBeUndefined()
    }
  })

  it("throws error when interactive tool call result is undefined", async () => {
    const setting = createRunSetting({
      input: { interactiveToolCallResult: undefined },
    })
    const checkpoint = createCheckpoint({
      status: "stoppedByInteractiveTool",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).rejects.toThrow("Interactive tool call result is undefined")
  })

  it("resumes correctly", async () => {
    const setting = createRunSetting({
      input: { text: "test-text" },
    })
    const checkpoint = createCheckpoint({
      status: "completed",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).resolves.toStrictEqual({
      type: "startRun",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      initialCheckpoint: checkpoint,
      inputMessages: [
        {
          type: "userMessage",
          id: expect.any(String),
          contents: [{ type: "textPart", id: expect.any(String), text: "test-text" }],
        },
      ],
    })
  })

  it("throws error when resuming with undefined text", async () => {
    const setting = createRunSetting({
      input: { text: undefined },
    })
    const checkpoint = createCheckpoint({
      status: "proceeding",
    })
    const step = createStep()
    await expect(
      StateMachineLogics.Init({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).rejects.toThrow("Input message is undefined")
  })
})
