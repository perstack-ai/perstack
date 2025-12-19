import { existsSync, statSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

interface DirectoryItem {
  name: string
  path: string
  type: "directory" | "file"
  size: number
  modified: string
}
export async function listDirectory(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  if (!existsSync(validatedPath)) {
    throw new Error(`Directory ${path} does not exist.`)
  }
  const stats = statSync(validatedPath)
  if (!stats.isDirectory()) {
    throw new Error(`Path ${path} is not a directory.`)
  }
  const entries = await readdir(validatedPath)
  const items: DirectoryItem[] = []
  for (const entry of entries.sort()) {
    try {
      const fullPath = await validatePath(join(validatedPath, entry))
      const entryStats = statSync(fullPath)
      const item: DirectoryItem = {
        name: entry,
        path: entry,
        type: entryStats.isDirectory() ? "directory" : "file",
        size: entryStats.size,
        modified: entryStats.mtime.toISOString(),
      }
      items.push(item)
    } catch (e) {
      if (e instanceof Error && e.message.includes("perstack directory is not allowed")) {
        continue
      }
      throw e
    }
  }
  return {
    path: validatedPath,
    items,
  }
}

export function registerListDirectory(server: McpServer) {
  server.registerTool(
    "listDirectory",
    {
      title: "List directory",
      description: dedent`
        Directory content lister with detailed file information.

        Use cases:
        - Exploring project structure
        - Finding files in a directory
        - Checking directory contents before operations
        - Understanding file organization

        How it works:
        - Lists all files and subdirectories in specified directory only
        - Provides file type, size, and modification time
        - Sorts entries alphabetically
        - Handles empty directories
        
        Parameters:
        - path: Directory path to list (optional, defaults to workspace root)
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await listDirectory(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
