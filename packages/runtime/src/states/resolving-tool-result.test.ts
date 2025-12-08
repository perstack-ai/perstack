import { createId } from "@paralleldrive/cuid2"
import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"
import { createEmptyUsage } from "../usage.js"

describe("@perstack/runtime: StateMachineLogic['ResolvingToolResult']", () => {
  it("processes tool result correctly", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "readTextFile",
        args: { path: "/test/file.txt" },
      },
      ],
      toolResults: [
        {
          id: "tc_123",
        skillName: "@perstack/base",
        toolName: "readTextFile",
        result: [
          {
            type: "textPart" as const,
            text: "File content successfully read",
            id: createId(),
          },
        ],
      },
      ],
    })
    await expect(
      StateMachineLogics.ResolvingToolResult({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).resolves.toStrictEqual({
      type: "finishToolCall",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      newMessages: [
        {
          type: "toolMessage",
          id: expect.any(String),
          contents: [
            {
              type: "toolResultPart",
              id: expect.any(String),
              toolCallId: "tc_123",
              toolName: "readTextFile",
              contents: [
                {
                  type: "textPart",
                  id: expect.any(String),
                  text: "File content successfully read",
                },
              ],
            },
          ],
        },
      ],
    })
  })

  it("throws error when tool calls or results missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      stepNumber: 1,
      newMessages: [],
      usage: createEmptyUsage(),
      startedAt: Date.now(),
    })
    await expect(
      StateMachineLogics.ResolvingToolResult({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No tool calls or tool results found")
  })

  it("filters non-text and non-image parts from result", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
        id: "tc_456",
        skillName: "@perstack/base",
        toolName: "readImageFile",
        args: { path: "/test/image.png" },
      },
      ],
      toolResults: [
        {
          id: "tc_456",
        skillName: "@perstack/base",
        toolName: "readImageFile",
        result: [
          { type: "textPart" as const, text: "Image description", id: createId() },
          {
            type: "imageInlinePart" as const,
            encodedData: "base64data",
            mimeType: "image/png",
            id: createId(),
          },
          {
            type: "fileBinaryPart" as const,
            data: "binary",
            mimeType: "application/pdf",
            id: createId(),
          },
        ],
      },
      ],
    })
    const result = await StateMachineLogics.ResolvingToolResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("finishToolCall")
    if (result.type !== "finishToolCall") throw new Error("Expected finishToolCall")
    const toolMessage = result.newMessages[0]
    const toolResultPart = toolMessage.contents[0]
    if (toolResultPart.type !== "toolResultPart") throw new Error("Expected toolResultPart")
    expect(toolResultPart.contents).toHaveLength(2)
  })
})
