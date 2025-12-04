import { createId } from "@paralleldrive/cuid2"
import { readFile } from "node:fs/promises"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)

describe("@perstack/runtime: StateMachineLogic['ResolvingPdfFile']", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("processes PDF file tool result correctly", async () => {
    mockReadFile.mockResolvedValue(Buffer.from("encoded_pdf_content"))
    const pdfInfo = {
      path: "/test.pdf",
      mimeType: "application/pdf",
      size: 2048,
    }
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "readPdfFile",
        args: { path: "/test/file.pdf" },
      },
      toolResult: {
        id: "tr_123",
        skillName: "@perstack/base",
        toolName: "readPdfFile",
        result: [
          {
            type: "textPart" as const,
            text: JSON.stringify(pdfInfo),
            id: createId(),
          },
        ],
      },
    })
    await expect(
      StateMachineLogics.ResolvingPdfFile({
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
              toolName: "readPdfFile",
              contents: [
                {
                  type: "textPart",
                  id: expect.any(String),
                  text: "User uploads PDF file as follows.",
                },
              ],
            },
          ],
        },
        {
          type: "userMessage",
          id: expect.any(String),
          contents: [
            {
              type: "fileInlinePart",
              id: expect.any(String),
              encodedData: Buffer.from("encoded_pdf_content").toString("base64"),
              mimeType: "application/pdf",
            },
          ],
        },
      ],
    })
  })

  it("handles file read error gracefully", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"))
    const pdfInfo = {
      path: "/nonexistent.pdf",
      mimeType: "application/pdf",
      size: 2048,
    }
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "readPdfFile",
        args: { path: "/nonexistent.pdf" },
      },
      toolResult: {
        id: "tr_123",
        skillName: "@perstack/base",
        toolName: "readPdfFile",
        result: [
          {
            type: "textPart" as const,
            text: JSON.stringify(pdfInfo),
            id: createId(),
          },
        ],
      },
    })
    const result = await StateMachineLogics.ResolvingPdfFile({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("finishToolCall")
    const userMessage = result.newMessages[1]
    expect(userMessage.contents[0]).toMatchObject({
      type: "textPart",
      text: expect.stringContaining('Failed to read PDF file "/nonexistent.pdf"'),
    })
  })
})
