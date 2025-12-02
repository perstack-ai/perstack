import { createId } from "@paralleldrive/cuid2"
import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

describe("@perstack/runtime: StateMachineLogic['ResolvingThought']", () => {
  it("processes thought tool result correctly", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "think",
        args: { thought: "Let me analyze this problem step by step" },
      },
      toolResult: {
        id: "tr_123",
        skillName: "@perstack/base",
        toolName: "think",
        result: [
          {
            type: "textPart" as const,
            text: "Analysis: The problem requires breaking down into smaller components.",
            id: createId(),
          },
        ],
      },
    })
    await expect(
      StateMachineLogics.ResolvingThought({
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
              toolName: "think",
              contents: [
                {
                  type: "textPart",
                  id: expect.any(String),
                  text: "Analysis: The problem requires breaking down into smaller components.",
                },
              ],
            },
          ],
        },
      ],
    })
  })
})
