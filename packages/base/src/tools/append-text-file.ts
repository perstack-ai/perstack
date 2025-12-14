import { stat } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { safeAppendFile } from "../lib/safe-file.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

export async function appendTextFile({ path, text }: { path: string; text: string }) {
  const validatedPath = await validatePath(path)
  const stats = await stat(validatedPath).catch(() => null)
  if (!stats) {
    throw new Error(`File ${path} does not exist.`)
  }
  if (!(stats.mode & 0o200)) {
    throw new Error(`File ${path} is not writable`)
  }
  await safeAppendFile(validatedPath, text)
  return { path: validatedPath, text }
}

export function registerAppendTextFile(server: McpServer) {
  server.registerTool(
    "appendTextFile",
    {
      title: "Append text file",
      description: dedent`
      Adding content to the end of existing files.

      Use cases:
      - Adding entries to log files
      - Appending data to CSV or JSON files
      - Adding new sections to documentation
      - Extending configuration files
      - Building files incrementally

      How it works:
      - Appends text to the end of an existing file
      - Does not modify existing content
      - Creates a new line before appending if needed
      - Returns the appended file path

      Rules:
      - FILE MUST EXIST BEFORE APPENDING
      - YOU MUST PROVIDE A VALID UTF-8 STRING FOR THE TEXT
    `,
      inputSchema: {
        path: z.string().describe("Target file path to append to."),
        text: z.string().describe("Text to append to the file."),
      },
    },
    async ({ path, text }: { path: string; text: string }) => {
      try {
        return successToolResult(await appendTextFile({ path, text }))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
