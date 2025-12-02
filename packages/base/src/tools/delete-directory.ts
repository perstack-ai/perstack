import { existsSync, statSync } from "node:fs"
import { rm, rmdir } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function deleteDirectory(input: { path: string; recursive?: boolean }) {
  const { path, recursive } = input
  const validatedPath = await validatePath(path)
  if (!existsSync(validatedPath)) {
    throw new Error(`Directory ${path} does not exist.`)
  }
  const stats = statSync(validatedPath)
  if (!stats.isDirectory()) {
    throw new Error(`Path ${path} is not a directory. Use deleteFile tool instead.`)
  }
  if (!(stats.mode & 0o200)) {
    throw new Error(`Directory ${path} is not writable`)
  }
  if (recursive) {
    await rm(validatedPath, { recursive: true })
  } else {
    await rmdir(validatedPath)
  }
  return {
    path: validatedPath,
  }
}

export function registerDeleteDirectory(server: McpServer) {
  server.registerTool(
    "deleteDirectory",
    {
      title: "Delete directory",
      description: dedent`
        Directory deleter for removing directories from the workspace.

        Use cases:
        - Removing temporary directories
        - Cleaning up build artifacts
        - Deleting empty directories after moving files

        How it works:
        - Validates directory existence and permissions
        - Removes directory (and contents if recursive is true)
        - Returns deletion status

        Parameters:
        - path: Directory path to delete
        - recursive: Set to true to delete non-empty directories
      `,
      inputSchema: {
        path: z.string(),
        recursive: z
          .boolean()
          .optional()
          .describe("Whether to delete contents recursively. Required for non-empty directories."),
      },
    },
    async (input: { path: string; recursive?: boolean }) => {
      try {
        return successToolResult(await deleteDirectory(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
