import { existsSync, statSync } from "node:fs"
import { unlink } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function deleteFile(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  if (!existsSync(validatedPath)) {
    throw new Error(`File ${path} does not exist.`)
  }
  const stats = statSync(validatedPath)
  if (stats.isDirectory()) {
    throw new Error(`Path ${path} is a directory. Use delete directory tool instead.`)
  }
  if (!(stats.mode & 0o200)) {
    throw new Error(`File ${path} is not writable`)
  }
  await unlink(validatedPath)
  return {
    path: validatedPath,
  }
}

export function registerDeleteFile(server: McpServer) {
  server.registerTool(
    "deleteFile",
    {
      title: "Delete file",
      description: dedent`
        File deleter for removing files from the workspace.

        Use cases:
        - Removing temporary files
        - Cleaning up generated files
        - Deleting outdated configuration files
        - Removing unwanted artifacts

        How it works:
        - Validates file existence and permissions
        - Performs atomic delete operation
        - Returns deletion status
        
        Parameters:
        - path: File path to delete
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await deleteFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
