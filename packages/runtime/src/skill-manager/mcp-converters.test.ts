import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { describe, expect, it } from "vitest"
import {
  convertPart,
  convertResource,
  convertToolResult,
  handleToolError,
} from "./mcp-converters.js"

// Mock McpError class for testing
class MockMcpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "McpError"
  }
}

describe("@perstack/runtime: handleToolError", () => {
  it("converts McpError to TextPart array", () => {
    const error = new MockMcpError("Tool execution failed")
    const result = handleToolError(error, "test-tool", MockMcpError as never)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("textPart")
    expect(result[0].text).toContain("Error calling tool test-tool")
    expect(result[0].text).toContain("Tool execution failed")
  })

  it("re-throws non-McpError errors", () => {
    const error = new Error("Regular error")
    expect(() => handleToolError(error, "test-tool", MockMcpError as never)).toThrow(
      "Regular error",
    )
  })

  it("includes tool name in error message", () => {
    const error = new MockMcpError("Failed")
    const result = handleToolError(error, "my-special-tool", MockMcpError as never)
    expect(result[0].text).toContain("my-special-tool")
  })
})

describe("@perstack/runtime: convertToolResult", () => {
  it("returns empty result message when content is empty", () => {
    const result: CallToolResult = { content: [] }
    const converted = convertToolResult(result, "test-tool", { arg: "value" })
    expect(converted).toHaveLength(1)
    expect(converted[0].type).toBe("textPart")
    expect(converted[0].text).toContain("Tool test-tool returned nothing")
    expect(converted[0].text).toContain('"arg":"value"')
  })

  it("returns empty result message when content is undefined", () => {
    const result = {} as CallToolResult
    const converted = convertToolResult(result, "test-tool", {})
    expect(converted).toHaveLength(1)
    expect(converted[0].text).toContain("returned nothing")
  })

  it("converts text content parts", () => {
    const result: CallToolResult = {
      content: [{ type: "text", text: "Hello world" }],
    }
    const converted = convertToolResult(result, "test-tool", {})
    expect(converted).toHaveLength(1)
    expect(converted[0].type).toBe("textPart")
    expect((converted[0] as { text: string }).text).toBe("Hello world")
  })

  it("filters out audio and resource_link types", () => {
    const result: CallToolResult = {
      content: [
        { type: "text", text: "Keep this" },
        { type: "audio" as never, data: "audio-data" },
        { type: "resource_link" as never, uri: "some-uri" },
      ],
    }
    const converted = convertToolResult(result, "test-tool", {})
    expect(converted).toHaveLength(1)
    expect((converted[0] as { text: string }).text).toBe("Keep this")
  })
})

describe("@perstack/runtime: convertPart", () => {
  describe("text parts", () => {
    it("converts text part correctly", () => {
      const part = { type: "text" as const, text: "Hello" }
      const result = convertPart(part)
      expect(result.type).toBe("textPart")
      expect((result as { text: string }).text).toBe("Hello")
    })

    it("returns error message for empty text", () => {
      const part = { type: "text" as const, text: "" }
      const result = convertPart(part)
      expect(result.type).toBe("textPart")
      expect((result as { text: string }).text).toBe("Error: No content")
    })

    it("returns error message for undefined text", () => {
      const part = { type: "text" as const, text: undefined as unknown as string }
      const result = convertPart(part)
      expect((result as { text: string }).text).toBe("Error: No content")
    })
  })

  describe("image parts", () => {
    it("converts image part correctly", () => {
      const part = { type: "image" as const, data: "base64data", mimeType: "image/png" }
      const result = convertPart(part)
      expect(result.type).toBe("imageInlinePart")
      expect((result as { encodedData: string }).encodedData).toBe("base64data")
      expect((result as { mimeType: string }).mimeType).toBe("image/png")
    })

    it("throws when image data is missing", () => {
      const part = { type: "image" as const, mimeType: "image/png" }
      expect(() => convertPart(part as never)).toThrow(
        "Image part must have both data and mimeType",
      )
    })

    it("throws when image mimeType is missing", () => {
      const part = { type: "image" as const, data: "base64data" }
      expect(() => convertPart(part as never)).toThrow(
        "Image part must have both data and mimeType",
      )
    })
  })

  describe("resource parts", () => {
    it("converts resource part with text", () => {
      const part = {
        type: "resource" as const,
        resource: { uri: "file://test", mimeType: "text/plain", text: "content" },
      }
      const result = convertPart(part)
      expect(result.type).toBe("textPart")
      expect((result as { text: string }).text).toBe("content")
    })

    it("throws when resource is missing", () => {
      const part = { type: "resource" as const }
      expect(() => convertPart(part as never)).toThrow("Resource part must have resource content")
    })
  })
})

describe("@perstack/runtime: convertResource", () => {
  it("converts text resource to textPart", () => {
    const resource = { uri: "file://test", mimeType: "text/plain", text: "Hello" }
    const result = convertResource(resource)
    expect(result.type).toBe("textPart")
    expect((result as { text: string }).text).toBe("Hello")
  })

  it("converts blob resource to fileInlinePart", () => {
    const resource = { uri: "file://test", mimeType: "application/pdf", blob: "base64data" }
    const result = convertResource(resource)
    expect(result.type).toBe("fileInlinePart")
    expect((result as { encodedData: string }).encodedData).toBe("base64data")
    expect((result as { mimeType: string }).mimeType).toBe("application/pdf")
  })

  it("throws when mimeType is missing", () => {
    const resource = { uri: "file://test", text: "content" }
    expect(() => convertResource(resource as never)).toThrow("has no mimeType")
  })

  it("throws for unsupported resource type", () => {
    const resource = { uri: "file://test", mimeType: "text/plain" }
    expect(() => convertResource(resource)).toThrow("Unsupported resource type")
  })

  it("prioritizes text over blob when both present", () => {
    const resource = {
      uri: "file://test",
      mimeType: "text/plain",
      text: "text content",
      blob: "blob data",
    }
    const result = convertResource(resource)
    expect(result.type).toBe("textPart")
    expect((result as { text: string }).text).toBe("text content")
  })
})
