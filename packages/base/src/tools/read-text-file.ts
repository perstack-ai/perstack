import { stat } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { safeReadFile } from "../lib/safe-file.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

export async function readTextFile(input: { path: string; from?: number; to?: number }) {
  const { path, from, to } = input
  const validatedPath = await validatePath(path)
  const stats = await stat(validatedPath).catch(() => null)
  if (!stats) {
    throw new Error(`File ${path} does not exist.`)
  }
  const fileContent = await safeReadFile(validatedPath)
  const lines = fileContent.split("\n")
  const fromLine = from ?? 0
  const toLine = to ?? lines.length
  const selectedLines = lines.slice(fromLine, toLine)
  const content = selectedLines.join("\n")
  return {
    path,
    content,
    from: fromLine,
    to: toLine,
  }
}

export function registerReadTextFile(server: McpServer) {
  server.registerTool(
    "readTextFile",
    {
      title: "Read text file",
      description: dedent`
        Text file reader with line range support for UTF-8 encoded files.

        Use cases:
        - Reading source code files for analysis
        - Extracting specific sections from large text files
        - Loading configuration or documentation files
        - Viewing log files or data files

        How it works:
        - Reads files as UTF-8 encoded text without format validation
        - Supports partial file reading via line number ranges
        - Returns content wrapped in JSON with metadata
        - WARNING: Binary files will cause errors or corrupted output

        Common file types:
        - Source code: .ts, .js, .py, .java, .cpp, etc.
        - Documentation: .md, .txt, .rst
        - Configuration: .json, .yaml, .toml, .ini
        - Data files: .csv, .log, .sql
      `,
      inputSchema: {
        path: z.string(),
        from: z.number().optional().describe("The line number to start reading from."),
        to: z.number().optional().describe("The line number to stop reading at."),
      },
    },
    async (input: { path: string; from?: number; to?: number }) => {
      try {
        return successToolResult(await readTextFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
