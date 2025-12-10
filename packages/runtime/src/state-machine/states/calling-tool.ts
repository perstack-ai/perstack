import { readFile } from "node:fs/promises"
import {
  attemptCompletion,
  callDelegate,
  callInteractiveTool,
  type MessagePart,
  type RunEvent,
  resolveToolResults,
  type ToolCall,
  type ToolResult,
} from "@perstack/core"
import type { RunSnapshot } from "../machine.js"
import type { BaseSkillManager } from "../../skill-manager/index.js"
import { getSkillManagerByToolName } from "../../skill-manager/index.js"
import type { McpSkillManager } from "../../skill-manager/mcp.js"

function hasRemainingTodos(toolResult: ToolResult): boolean {
  const firstPart = toolResult.result[0]
  if (!firstPart || firstPart.type !== "textPart") {
    return false
  }
  try {
    const parsed = JSON.parse(firstPart.text)
    return Array.isArray(parsed.remainingTodos) && parsed.remainingTodos.length > 0
  } catch {
    return false
  }
}

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

async function executeMcpToolCall(
  toolCall: ToolCall,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<ToolResult> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  if (skillManager.type !== "mcp") {
    throw new Error(`Incorrect SkillType, required MCP, got ${skillManager.type}`)
  }
  const result = await (skillManager as McpSkillManager).callTool(toolCall.toolName, toolCall.args)
  const toolResult: ToolResult = {
    id: toolCall.id,
    skillName: toolCall.skillName,
    toolName: toolCall.toolName,
    result,
  }
  if (toolCall.toolName === "readPdfFile" || toolCall.toolName === "readImageFile") {
    return processFileToolResult(toolResult, toolCall.toolName)
  }
  return toolResult
}

async function getToolType(
  toolCall: ToolCall,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<"mcp" | "delegate" | "interactive"> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  return skillManager.type
}

export async function callingToolLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  const pendingToolCalls = step.pendingToolCalls ?? step.toolCalls ?? []
  if (pendingToolCalls.length === 0) {
    throw new Error("No tool calls found")
  }
  const toolResults: ToolResult[] = step.toolResults ? [...step.toolResults] : []
  const attemptCompletionTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "attemptCompletion",
  )
  if (attemptCompletionTool) {
    const toolResult = await executeMcpToolCall(attemptCompletionTool, skillManagers)
    if (hasRemainingTodos(toolResult)) {
      return resolveToolResults(setting, checkpoint, { toolResults: [toolResult] })
    }
    return attemptCompletion(setting, checkpoint, { toolResult })
  }
  const toolCallTypes = await Promise.all(
    pendingToolCalls.map(async (tc) => ({
      toolCall: tc,
      type: await getToolType(tc, skillManagers),
    })),
  )
  const mcpToolCalls = toolCallTypes.filter((t) => t.type === "mcp").map((t) => t.toolCall)
  const delegateToolCalls = toolCallTypes
    .filter((t) => t.type === "delegate")
    .map((t) => t.toolCall)
  const interactiveToolCalls = toolCallTypes
    .filter((t) => t.type === "interactive")
    .map((t) => t.toolCall)
  if (mcpToolCalls.length > 0) {
    const mcpResults = await Promise.all(
      mcpToolCalls.map((tc) => executeMcpToolCall(tc, skillManagers)),
    )
    toolResults.push(...mcpResults)
  }
  if (delegateToolCalls.length > 0) {
    step.partialToolResults = toolResults
    step.pendingToolCalls = [...delegateToolCalls, ...interactiveToolCalls]
    return callDelegate(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCalls: delegateToolCalls,
      usage: step.usage,
    })
  }
  if (interactiveToolCalls.length > 0) {
    const interactiveToolCall = interactiveToolCalls[0]
    if (!interactiveToolCall) {
      throw new Error("No interactive tool call found")
    }
    step.partialToolResults = toolResults
    step.pendingToolCalls = interactiveToolCalls
    return callInteractiveTool(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCall: interactiveToolCall,
      usage: step.usage,
    })
  }
  return resolveToolResults(setting, checkpoint, { toolResults })
}
