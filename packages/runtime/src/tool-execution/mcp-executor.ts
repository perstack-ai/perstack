import { readFile } from "node:fs/promises"
import type { MessagePart, SkillType, ToolCall, ToolResult } from "@perstack/core"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { getSkillManagerByToolName } from "../skill-manager/helpers.js"
import type { McpSkillManager } from "../skill-manager/mcp.js"
import type { ToolExecutor } from "./tool-executor.js"

type FileInfo = { path: string; mimeType: string; size: number }

function isFileInfo(value: unknown): value is FileInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "mimeType" in value &&
    "size" in value &&
    typeof (value as FileInfo).path === "string" &&
    typeof (value as FileInfo).mimeType === "string" &&
    typeof (value as FileInfo).size === "number"
  )
}

async function processFileToolResult(
  toolResult: ToolResult,
  toolName: "readPdfFile" | "readImageFile",
): Promise<ToolResult> {
  const processedContents: MessagePart[] = []
  for (const part of toolResult.result) {
    if (part.type !== "textPart") {
      processedContents.push(part)
      continue
    }
    let fileInfo: FileInfo | undefined
    try {
      const parsed = JSON.parse(part.text)
      if (isFileInfo(parsed)) {
        fileInfo = parsed
      }
    } catch {
      processedContents.push(part)
      continue
    }
    if (!fileInfo) {
      processedContents.push(part)
      continue
    }
    const { path, mimeType } = fileInfo
    try {
      const buffer = await readFile(path)
      if (toolName === "readImageFile") {
        processedContents.push({
          type: "imageInlinePart",
          id: part.id,
          encodedData: buffer.toString("base64"),
          mimeType,
        })
      } else {
        processedContents.push({
          type: "fileInlinePart",
          id: part.id,
          encodedData: buffer.toString("base64"),
          mimeType,
        })
      }
    } catch (error) {
      processedContents.push({
        type: "textPart",
        id: part.id,
        text: `Failed to read file "${path}": ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  return { ...toolResult, result: processedContents }
}

/**
 * Executor for MCP (Model Context Protocol) tools.
 * Handles standard MCP tool calls including file processing for readPdfFile/readImageFile.
 */
export class McpToolExecutor implements ToolExecutor {
  readonly type: SkillType = "mcp"

  async execute(
    toolCall: ToolCall,
    skillManagers: Record<string, BaseSkillManager>,
  ): Promise<ToolResult> {
    const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
    if (skillManager.type !== "mcp") {
      throw new Error(`Incorrect SkillType, required MCP, got ${skillManager.type}`)
    }
    const result = await (skillManager as McpSkillManager).callTool(
      toolCall.toolName,
      toolCall.args,
    )
    const toolResult: ToolResult = {
      id: toolCall.id,
      skillName: toolCall.skillName,
      toolName: toolCall.toolName,
      result,
    }
    // Handle special file reading tools
    if (toolCall.toolName === "readPdfFile" || toolCall.toolName === "readImageFile") {
      return processFileToolResult(toolResult, toolCall.toolName)
    }
    return toolResult
  }
}
