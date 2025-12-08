import { createId } from "@paralleldrive/cuid2"
import { readFile } from "node:fs/promises"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)

describe("@perstack/runtime: StateMachineLogic['ResolvingImageFile']", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("processes image file tool result correctly", async () => {
    mockReadFile.mockResolvedValue(Buffer.from("encoded_image"))
    const imageInfo = {
      path: "/test/image.png",
      mimeType: "image/png",
      size: 1024,
    }
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readImageFile",
          args: { path: "/test/image.png" },
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readImageFile",
          result: [
            {
              type: "textPart" as const,
              text: JSON.stringify(imageInfo),
              id: createId(),
            },
          ],
        },
      ],
    })
    await expect(
      StateMachineLogics.ResolvingImageFile({
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
              toolName: "readImageFile",
              contents: [
                {
                  type: "imageInlinePart",
                  id: expect.any(String),
                  encodedData: Buffer.from("encoded_image").toString("base64"),
                  mimeType: "image/png",
                },
              ],
            },
          ],
        },
      ],
    })
  })

  it("handles file read error gracefully", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"))
    const imageInfo = {
      path: "/nonexistent.png",
      mimeType: "image/png",
      size: 1024,
    }
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readImageFile",
          args: { path: "/nonexistent.png" },
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readImageFile",
          result: [
            {
              type: "textPart" as const,
              text: JSON.stringify(imageInfo),
              id: createId(),
            },
          ],
        },
      ],
    })
    const result = await StateMachineLogics.ResolvingImageFile({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("finishToolCall")
    if (result.type !== "finishToolCall") throw new Error("Unexpected event type")
    const toolResultPart = result.newMessages[0].contents[0]
    if (toolResultPart.type !== "toolResultPart") throw new Error("Unexpected part type")
    expect(toolResultPart.contents[0]).toMatchObject({
      type: "textPart",
      text: expect.stringContaining('Failed to read image file "/nonexistent.png"'),
    })
  })
})
