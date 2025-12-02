import { existsSync, statSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function editTextFile(input: { path: string; newText: string; oldText: string }) {
  const { path, newText, oldText } = input
  const validatedPath = await validatePath(path)
  if (!existsSync(validatedPath)) {
    throw new Error(`File ${path} does not exist.`)
  }
  const stats = statSync(validatedPath)
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
  const content = normalizeLineEndings(await readFile(filePath, "utf-8"))
  const normalizedOld = normalizeLineEndings(oldText)
  const normalizedNew = normalizeLineEndings(newText)
  if (!content.includes(normalizedOld)) {
    throw new Error(`Could not find exact match for oldText in file ${filePath}`)
  }
  const modifiedContent = content.replace(normalizedOld, normalizedNew)
  await writeFile(filePath, modifiedContent, "utf-8")
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
        - THERE IS A LIMIT ON THE NUMBER OF TOKENS THAT CAN BE GENERATED, SO DO NOT WRITE ALL THE CONTENT AT ONCE (IT WILL CAUSE AN ERROR)
        - IF YOU WANT TO EDIT MORE THAN 2000 CHARACTERS, USE THIS TOOL MULTIPLE TIMES
        - DO NOT USE THIS TOOL FOR APPENDING TEXT TO FILES - USE appendTextFile TOOL INSTEAD
      `,
      inputSchema: {
        path: z.string().describe("Target file path to edit."),
        newText: z
          .string()
          .min(1)
          .max(2_000)
          .describe("Text to append to the file. Max 2000 characters."),
        oldText: z
          .string()
          .min(1)
          .max(2_000)
          .describe("Exact text to find and replace. Max 2000 characters."),
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
