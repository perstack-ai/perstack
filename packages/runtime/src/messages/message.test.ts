import { describe, expect, it } from "vitest"
import { createInstructionMessage } from "./instruction-message.js"
import {
  createExpertMessage,
  createToolMessage,
  createUserMessage,
  messageToCoreMessage,
} from "./message.js"

describe("@perstack/messages: message", () => {
  describe("createUserMessage", () => {
    it("creates user message", () => {
      const result = createUserMessage([
        { type: "textPart", text: "Check this image:" },
        { type: "imageUrlPart", url: "https://example.com/image.png", mimeType: "image/png" },
        { type: "imageInlinePart", encodedData: "base64data", mimeType: "image/jpeg" },
        {
          type: "imageBinaryPart",
          data: Buffer.from("binary").toString("base64"),
          mimeType: "image/gif",
        },
        { type: "fileUrlPart", url: "https://example.com/doc.pdf", mimeType: "application/pdf" },
        { type: "fileInlinePart", encodedData: "filedata", mimeType: "text/plain" },
        {
          type: "fileBinaryPart",
          data: Buffer.from("filebinary").toString("base64"),
          mimeType: "application/octet-stream",
        },
      ])
      expect(result).toEqual({
        type: "userMessage",
        id: expect.any(String),
        contents: [
          { type: "textPart", text: "Check this image:", id: expect.any(String) },
          {
            type: "imageUrlPart",
            url: "https://example.com/image.png",
            mimeType: "image/png",
            id: expect.any(String),
          },
          {
            type: "imageInlinePart",
            encodedData: "base64data",
            mimeType: "image/jpeg",
            id: expect.any(String),
          },
          {
            type: "imageBinaryPart",
            data: Buffer.from("binary").toString("base64"),
            mimeType: "image/gif",
            id: expect.any(String),
          },
          {
            type: "fileUrlPart",
            url: "https://example.com/doc.pdf",
            mimeType: "application/pdf",
            id: expect.any(String),
          },
          {
            type: "fileInlinePart",
            encodedData: "filedata",
            mimeType: "text/plain",
            id: expect.any(String),
          },
          {
            type: "fileBinaryPart",
            data: Buffer.from("filebinary").toString("base64"),
            mimeType: "application/octet-stream",
            id: expect.any(String),
          },
        ],
      })
    })
  })

  describe("createExpertMessage", () => {
    it("creates expert message", () => {
      const result = createExpertMessage([
        {
          type: "toolCallPart",
          toolCallId: "call-1",
          toolName: "readFile",
          args: { path: "/file1.txt" },
        },
        {
          type: "toolCallPart",
          toolCallId: "call-2",
          toolName: "readFile",
          args: { path: "/file2.txt" },
        },
      ])
      expect(result).toEqual({
        type: "expertMessage",
        id: expect.any(String),
        contents: [
          {
            type: "toolCallPart",
            toolCallId: "call-1",
            toolName: "readFile",
            args: { path: "/file1.txt" },
            id: expect.any(String),
          },
          {
            type: "toolCallPart",
            toolCallId: "call-2",
            toolName: "readFile",
            args: { path: "/file2.txt" },
            id: expect.any(String),
          },
        ],
      })
    })
  })

  describe("createToolMessage", () => {
    it("creates tool message", () => {
      const result = createToolMessage([
        {
          type: "toolResultPart",
          toolCallId: "call-1",
          toolName: "tool1",
          contents: [{ type: "textPart", text: "Result 1" }],
          isError: false,
        },
        {
          type: "toolResultPart",
          toolCallId: "call-2",
          toolName: "tool2",
          contents: [{ type: "textPart", text: "Result 2" }],
          isError: false,
        },
      ])
      expect(result).toEqual({
        type: "toolMessage",
        id: expect.any(String),
        contents: [
          {
            type: "toolResultPart",
            toolCallId: "call-1",
            toolName: "tool1",
            contents: [{ type: "textPart", text: "Result 1", id: expect.any(String) }],
            id: expect.any(String),
            isError: false,
          },
          {
            type: "toolResultPart",
            toolCallId: "call-2",
            toolName: "tool2",
            contents: [{ type: "textPart", text: "Result 2", id: expect.any(String) }],
            id: expect.any(String),
            isError: false,
          },
        ],
      })
    })
  })

  describe("messageToCoreMessage", () => {
    it("converts instruction message", () => {
      const result = messageToCoreMessage({
        type: "instructionMessage" as const,
        id: "msg-1",
        cache: true,
        contents: [
          {
            id: "content-1",
            type: "textPart" as const,
            text: "You are a helpful assistant.",
          },
        ],
      })
      expect(result).toEqual({
        role: "system",
        content: "You are a helpful assistant.",
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      })
    })

    it("converts instruction message without cache", () => {
      const result = messageToCoreMessage({
        type: "instructionMessage" as const,
        id: "msg-1",
        cache: false,
        contents: [
          {
            id: "content-1",
            type: "textPart" as const,
            text: "You are a helpful assistant.",
          },
        ],
      })
      expect(result).toEqual({
        role: "system",
        content: "You are a helpful assistant.",
        providerOptions: undefined,
      })
    })

    describe("user message conversion", () => {
      it("converts user message", () => {
        const result = messageToCoreMessage({
          type: "userMessage" as const,
          id: "msg-1",
          cache: true,
          contents: [
            { id: "content-1", type: "textPart" as const, text: "Hello!" },
            {
              type: "imageUrlPart",
              url: "https://example.com/img.png",
              mimeType: "image/png",
              id: "content-2",
            },
            {
              type: "imageInlinePart",
              encodedData: "base64",
              mimeType: "image/jpeg",
              id: "content-3",
            },
            {
              type: "imageBinaryPart",
              data: Buffer.from("binary").toString("base64"),
              mimeType: "image/gif",
              id: "content-3",
            },
            {
              type: "fileUrlPart",
              url: "https://example.com/doc.pdf",
              mimeType: "application/pdf",
              id: "content-4",
            },
            {
              type: "fileInlinePart",
              encodedData: "filedata",
              mimeType: "text/plain",
              id: "content-5",
            },
            {
              type: "fileBinaryPart",
              data: Buffer.from("binary").toString("base64"),
              mimeType: "application/octet-stream",
              id: "content-6",
            },
          ],
        })

        expect(result).toEqual({
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello!",
            },
            {
              type: "image",
              image: "https://example.com/img.png",
              mediaType: "image/png",
            },
            {
              type: "image",
              image: "base64",
              mediaType: "image/jpeg",
            },
            {
              type: "image",
              image: Buffer.from("binary").toString("base64"),
              mediaType: "image/gif",
            },
            {
              type: "file",
              data: "https://example.com/doc.pdf",
              mediaType: "application/pdf",
            },
            {
              type: "file",
              data: "filedata",
              mediaType: "text/plain",
            },
            {
              type: "file",
              data: Buffer.from("binary").toString("base64"),
              mediaType: "application/octet-stream",
            },
          ],
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        })
      })

      it("converts expert message", () => {
        const result = messageToCoreMessage({
          type: "expertMessage" as const,
          id: "msg-1",
          cache: true,
          contents: [
            { id: "content-1", type: "textPart" as const, text: "I can help with that." },
            {
              type: "toolCallPart",
              toolCallId: "call-1",
              toolName: "searchFiles",
              args: { query: "test" },
              id: "content-2",
            },
          ],
        })
        expect(result).toEqual({
          role: "assistant",
          content: [
            {
              type: "text",
              text: "I can help with that.",
            },
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "searchFiles",
              input: { query: "test" },
            },
          ],
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        })
      })

      it("converts tool message", () => {
        const result = messageToCoreMessage({
          type: "toolMessage" as const,
          id: "msg-1",
          cache: true,
          contents: [
            {
              id: "content-1",
              type: "toolResultPart" as const,
              toolCallId: "call-123",
              toolName: "readFile",
              contents: [{ type: "textPart", text: "File contents", id: "content-2" }],
              isError: false,
            },
          ],
        })
        expect(result).toEqual({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call-123",
              toolName: "readFile",
              output: {
                type: "text",
                value: "File contents",
              },
            },
          ],
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        })
      })

      it("converts tool message with image content", () => {
        const result = messageToCoreMessage({
          type: "toolMessage" as const,
          id: "msg-1",
          cache: false,
          contents: [
            {
              id: "content-1",
              type: "toolResultPart" as const,
              toolCallId: "call-456",
              toolName: "readImage",
              contents: [
                {
                  type: "imageInlinePart",
                  encodedData: "base64imagedata",
                  mimeType: "image/png",
                  id: "content-2",
                },
              ],
              isError: false,
            },
          ],
        })
        expect(result).toEqual({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call-456",
              toolName: "readImage",
              output: {
                type: "content",
                value: [
                  {
                    type: "media",
                    data: "base64imagedata",
                    mediaType: "image/png",
                  },
                ],
              },
            },
          ],
          providerOptions: undefined,
        })
      })

      it("converts user message without cache", () => {
        const result = messageToCoreMessage({
          type: "userMessage" as const,
          id: "msg-1",
          contents: [{ id: "content-1", type: "textPart" as const, text: "Hello!" }],
        })
        expect(result).toEqual({
          role: "user",
          content: [{ type: "text", text: "Hello!" }],
          providerOptions: undefined,
        })
      })

      it("converts expert message without cache", () => {
        const result = messageToCoreMessage({
          type: "expertMessage" as const,
          id: "msg-1",
          contents: [{ id: "content-1", type: "textPart" as const, text: "Response" }],
        })
        expect(result).toEqual({
          role: "assistant",
          content: [{ type: "text", text: "Response" }],
          providerOptions: undefined,
        })
      })
    })
  })
})

describe("@perstack/messages: instruction-message", () => {
  const startedAt = 1700000000000

  describe("createInstructionMessage", () => {
    it("creates instruction message with basic expert", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "You are a test expert.",
        skills: {},
        delegates: [],
        tags: [],
      }
      const result = createInstructionMessage(expert, {}, startedAt)
      expect(result.type).toBe("instructionMessage")
      expect(result.cache).toBe(true)
      expect(result.contents[0].type).toBe("textPart")
      expect(result.contents[0].text).toContain("You are a test expert.")
    })

    it("includes skill rules when present", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {
          "test-skill": {
            type: "mcpStdioSkill" as const,
            name: "test-skill",
            command: "npx",
            args: ["-y", "test"],
            requiredEnv: [],
            pick: [],
            omit: [],
            lazyInit: false,
            rule: "Always use this skill carefully.",
          },
        },
        delegates: [],
        tags: [],
      }
      const result = createInstructionMessage(expert, {}, startedAt)
      expect(result.contents[0].text).toContain("Always use this skill carefully.")
      expect(result.contents[0].text).toContain('"test-skill" skill rules:')
    })

    it("skips skill rules when not present", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {
          "test-skill": {
            type: "mcpStdioSkill" as const,
            name: "test-skill",
            command: "npx",
            args: ["-y", "test"],
            requiredEnv: [],
            pick: [],
            omit: [],
            lazyInit: false,
          },
        },
        delegates: [],
        tags: [],
      }
      const result = createInstructionMessage(expert, {}, startedAt)
      expect(result.contents[0].text).not.toContain('"test-skill" skill rules:')
    })

    it("includes delegate rules when delegate exists", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: ["delegate-expert"],
        tags: [],
      }
      const experts = {
        "test-expert": expert,
        "delegate-expert": {
          key: "delegate-expert",
          name: "Delegate Expert",
          version: "1.0.0",
          description: "A delegate expert for testing",
          instruction: "Delegate instruction",
          skills: {},
          delegates: [],
          tags: [],
        },
      }
      const result = createInstructionMessage(expert, experts, startedAt)
      expect(result.contents[0].text).toContain('About "Delegate Expert":')
      expect(result.contents[0].text).toContain("A delegate expert for testing")
    })

    it("skips delegate rules when delegate not found", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: ["nonexistent-delegate"],
        tags: [],
      }
      const result = createInstructionMessage(expert, {}, startedAt)
      expect(result.contents[0].text).not.toContain('About "')
    })

    it("uses startedAt for timestamp in instruction", () => {
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
      }
      const result = createInstructionMessage(expert, {}, startedAt)
      expect(result.contents[0].text).toContain("2023-11-14T22:13:20.000Z")
    })
  })
})
