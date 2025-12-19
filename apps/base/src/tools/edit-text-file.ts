import { stat } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { safeReadFile, safeWriteFile } from "../lib/safe-file.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

export async function editTextFile(input: { path: string; newText: string; oldText: string }) {
  const { path, newText, oldText } = input
  const validatedPath = await validatePath(path)
  const stats = await stat(validatedPath).catch(() => null)
  if (!stats) {
    throw new Error(`File ${path} does not exist.`)
  }
  if (!(stats.mode & 0o200)) {
    throw new Error(`File ${path} is not writable`)
  }
  await applyFileEdit(validatedPath, newText, oldText)
  return {
    path: validatedPath,
    newText,
    oldText,
  }
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n")
}

async function applyFileEdit(filePath: string, newText: string, oldText: string) {
  const content = normalizeLineEndings(await safeReadFile(filePath))
  const normalizedOld = normalizeLineEndings(oldText)
  const normalizedNew = normalizeLineEndings(newText)
  if (!content.includes(normalizedOld)) {
    throw new Error(`Could not find exact match for oldText in file ${filePath}`)
  }
  const modifiedContent = content.replace(normalizedOld, normalizedNew)
  await safeWriteFile(filePath, modifiedContent)
}

export function registerEditTextFile(server: McpServer) {
  server.registerTool(
    "editTextFile",
    {
      title: "Edit text file",
      description: dedent`
        Text file editor for modifying existing files with precise text replacement.

        Use cases:
        - Updating configuration values
        - Modifying code snippets
        - Replacing specific text blocks
        - Making targeted edits to files

        How it works:
        - Reads existing file content
        - Performs exact text replacement of oldText with newText
        - Normalizes line endings for consistent behavior
        - Returns summary of changes made
        - For appending text to files, use the appendTextFile tool instead
        
        Rules:
        - YOU MUST PROVIDE A VALID UTF-8 STRING FOR THE TEXT
        - DO NOT USE THIS TOOL FOR APPENDING TEXT TO FILES - USE appendTextFile TOOL INSTEAD
      `,
      inputSchema: {
        path: z.string().describe("Target file path to edit."),
        newText: z.string().describe("Text to replace with."),
        oldText: z.string().describe("Exact text to find and replace."),
      },
    },
    async (input: { path: string; newText: string; oldText: string }) => {
      try {
        return successToolResult(await editTextFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
