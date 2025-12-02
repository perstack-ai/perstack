import { existsSync, statSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function writeTextFile(input: { path: string; text: string }) {
  const { path, text } = input
  const validatedPath = await validatePath(path)
  if (existsSync(validatedPath)) {
    const stats = statSync(validatedPath)
    if (!(stats.mode & 0o200)) {
      throw new Error(`File ${path} is not writable`)
    }
  }
  const dir = dirname(validatedPath)
  await mkdir(dir, { recursive: true })
  await writeFile(validatedPath, text, "utf-8")
  return {
    path: validatedPath,
    text,
  }
}

export function registerWriteTextFile(server: McpServer) {
  server.registerTool(
    "writeTextFile",
    {
      title: "writeTextFile",
      description: dedent`
        Text file writer that creates or overwrites files with UTF-8 content.

        Use cases:
        - Creating new configuration files
        - Writing generated code or documentation
        - Saving processed data or results
        - Creating log files or reports

        How it works:
        - Writes content as UTF-8 encoded text
        - Returns success status with file path

        Rules:
        - IF THE FILE ALREADY EXISTS, IT WILL BE OVERWRITTEN
        - YOU MUST PROVIDE A VALID UTF-8 STRING FOR THE TEXT
        - THERE IS A LIMIT ON THE NUMBER OF TOKENS THAT CAN BE GENERATED, SO DO NOT WRITE ALL THE CONTENT AT ONCE (IT WILL CAUSE AN ERROR)
        - IF YOU WANT TO WRITE MORE THAN 10,000 CHARACTERS, USE "appendTextFile" TOOL AFTER THIS ONE
      `,
      inputSchema: {
        path: z.string().describe("Target file path (relative or absolute)."),
        text: z.string().max(10_000).describe("Text to write to the file. Max 10000 characters."),
      },
    },
    async (input: { path: string; text: string }) => {
      try {
        return successToolResult(await writeTextFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
