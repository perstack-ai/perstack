import { existsSync, statSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function createDirectory(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  const exists = existsSync(validatedPath)
  if (exists) {
    throw new Error(`Directory ${path} already exists`)
  }
  const parentDir = dirname(validatedPath)
  if (existsSync(parentDir)) {
    const parentStats = statSync(parentDir)
    if (!(parentStats.mode & 0o200)) {
      throw new Error(`Parent directory ${parentDir} is not writable`)
    }
  }
  await mkdir(validatedPath, { recursive: true })
  return {
    path: validatedPath,
  }
}

export function registerCreateDirectory(server: McpServer) {
  server.registerTool(
    "createDirectory",
    {
      title: "Create directory",
      description: dedent`
        Directory creator for establishing folder structures in the workspace.

        Use cases:
        - Setting up project directory structure
        - Creating output folders for generated content
        - Organizing files into logical groups
        - Preparing directory hierarchies

        How it works:
        - Creates directories recursively
        - Handles existing directories gracefully
        - Creates parent directories as needed
        - Returns creation status
        
        Parameters:
        - path: Directory path to create
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await createDirectory(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
