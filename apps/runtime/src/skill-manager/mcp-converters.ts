import type { CallToolResult, McpError } from "@modelcontextprotocol/sdk/types.js"
import { createId } from "@paralleldrive/cuid2"
import type {
  CallToolResultContent,
  FileInlinePart,
  ImageInlinePart,
  Resource,
  TextPart,
} from "@perstack/core"

/**
 * Handle MCP tool errors and convert them to TextPart responses.
 * McpError instances are converted to error messages, other errors are re-thrown.
 */
export function handleToolError(
  error: unknown,
  toolName: string,
  McpErrorClass: typeof McpError,
): Array<TextPart> {
  if (error instanceof McpErrorClass) {
    return [
      {
        type: "textPart",
        text: `Error calling tool ${toolName}: ${error.message}`,
        id: createId(),
      },
    ]
  }
  throw error
}

/**
 * Convert MCP CallToolResult to internal part types.
 */
export function convertToolResult(
  result: CallToolResult,
  toolName: string,
  input: Record<string, unknown>,
): Array<TextPart | ImageInlinePart | FileInlinePart> {
  if (!result.content || result.content.length === 0) {
    return [
      {
        type: "textPart",
        text: `Tool ${toolName} returned nothing with arguments: ${JSON.stringify(input)}`,
        id: createId(),
      },
    ]
  }

  return result.content
    .filter((part) => part.type !== "audio" && part.type !== "resource_link")
    .map((part) => convertPart(part as CallToolResultContent))
}

/**
 * Convert a single MCP content part to internal part type.
 */
export function convertPart(
  part: CallToolResultContent,
): TextPart | ImageInlinePart | FileInlinePart {
  switch (part.type) {
    case "text":
      if (!part.text || part.text === "") {
        return { type: "textPart", text: "Error: No content", id: createId() }
      }
      return { type: "textPart", text: part.text, id: createId() }

    case "image":
      if (!part.data || !part.mimeType) {
        throw new Error("Image part must have both data and mimeType")
      }
      return {
        type: "imageInlinePart",
        encodedData: part.data,
        mimeType: part.mimeType,
        id: createId(),
      }

    case "resource":
      if (!part.resource) {
        throw new Error("Resource part must have resource content")
      }
      return convertResource(part.resource)
  }
}

/**
 * Convert MCP resource to internal part type.
 */
export function convertResource(resource: Resource): TextPart | FileInlinePart {
  if (!resource.mimeType) {
    throw new Error(`Resource ${JSON.stringify(resource)} has no mimeType`)
  }

  if (resource.text && typeof resource.text === "string") {
    return { type: "textPart", text: resource.text, id: createId() }
  }

  if (resource.blob && typeof resource.blob === "string") {
    return {
      type: "fileInlinePart",
      encodedData: resource.blob,
      mimeType: resource.mimeType,
      id: createId(),
    }
  }

  throw new Error(`Unsupported resource type: ${JSON.stringify(resource)}`)
}
