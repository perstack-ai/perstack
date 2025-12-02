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
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "readTextFile",
        args: { path: "/test/file.txt" },
      },
      toolResult: {
        id: "tr_123",
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

  it("throws error when tool call or result missing", async () => {
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
    ).rejects.toThrow("No tool call or tool result found")
  })
})
