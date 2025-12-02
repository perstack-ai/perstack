import { existsSync, statSync } from "node:fs"
import { basename, dirname, extname, resolve } from "node:path"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import mime from "mime-types"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function getFileInfo(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  if (!existsSync(validatedPath)) {
    throw new Error(`File or directory ${path} does not exist`)
  }
  const stats = statSync(validatedPath)
  const isDirectory = stats.isDirectory()
  const mimeType = isDirectory ? null : mime.lookup(validatedPath) || "application/octet-stream"
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
  }
  return {
    exists: true,
    path: validatedPath,
    absolutePath: resolve(validatedPath),
    name: basename(validatedPath),
    directory: dirname(validatedPath),
    extension: isDirectory ? null : extname(validatedPath),
    type: isDirectory ? "directory" : "file",
    mimeType,
    size: stats.size,
    sizeFormatted: formatSize(stats.size),
    created: stats.birthtime.toISOString(),
    modified: stats.mtime.toISOString(),
    accessed: stats.atime.toISOString(),
    permissions: {
      readable: true,
      writable: Boolean(stats.mode & 0o200),
      executable: Boolean(stats.mode & 0o100),
    },
  }
}

export function registerGetFileInfo(server: McpServer) {
  server.registerTool(
    "getFileInfo",
    {
      title: "Get file info",
      description: dedent`
        File information retriever for detailed metadata about files and directories.

        Use cases:
        - Checking file existence and type
        - Getting file size and timestamps
        - Determining MIME types
        - Validating file accessibility

        How it works:
        - Retrieves comprehensive file system metadata
        - Detects MIME type from file extension
        - Provides both absolute and relative paths
        - Returns human-readable file sizes
        
        Parameters:
        - path: File or directory path to inspect
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await getFileInfo(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
