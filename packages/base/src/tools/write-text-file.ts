import { mkdir, stat } from "node:fs/promises"
import { dirname } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { safeWriteFile } from "../lib/safe-file.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

export async function writeTextFile(input: { path: string; text: string }) {
  const { path, text } = input
  const validatedPath = await validatePath(path)
  const stats = await stat(validatedPath).catch(() => null)
  if (stats && !(stats.mode & 0o200)) {
    throw new Error(`File ${path} is not writable`)
  }
  const dir = dirname(validatedPath)
  await mkdir(dir, { recursive: true })
  await safeWriteFile(validatedPath, text)
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
      `,
      inputSchema: {
        path: z.string().describe("Target file path (relative or absolute)."),
        text: z.string().describe("Text to write to the file."),
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
