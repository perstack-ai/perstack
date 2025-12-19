import { existsSync, statSync } from "node:fs"
import { mkdir, rename } from "node:fs/promises"
import { dirname } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function moveFile(input: { source: string; destination: string }) {
  const { source, destination } = input
  const validatedSource = await validatePath(source)
  const validatedDestination = await validatePath(destination)
  if (!existsSync(validatedSource)) {
    throw new Error(`Source file ${source} does not exist.`)
  }
  const sourceStats = statSync(validatedSource)
  if (!(sourceStats.mode & 0o200)) {
    throw new Error(`Source file ${source} is not writable`)
  }
  if (existsSync(validatedDestination)) {
    throw new Error(`Destination ${destination} already exists.`)
  }
  const destDir = dirname(validatedDestination)
  await mkdir(destDir, { recursive: true })
  await rename(validatedSource, validatedDestination)
  return {
    source: validatedSource,
    destination: validatedDestination,
  }
}

export function registerMoveFile(server: McpServer) {
  server.registerTool(
    "moveFile",
    {
      title: "Move file",
      description: dedent`
        File mover for relocating or renaming files within the workspace.

        Use cases:
        - Renaming files to follow naming conventions
        - Moving files to different directories
        - Organizing project structure
        - Backing up files before modifications

        How it works:
        - Validates source file existence
        - Creates destination directory if needed
        - Performs atomic move operation
        - Preserves file permissions and timestamps
        
        Parameters:
        - source: Current file path
        - destination: Target file path
      `,
      inputSchema: {
        source: z.string(),
        destination: z.string(),
      },
    },
    async (input: { source: string; destination: string }) => {
      try {
        return successToolResult(await moveFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
