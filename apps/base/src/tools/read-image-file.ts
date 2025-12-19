import { existsSync } from "node:fs"
import { stat } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import mime from "mime-types"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

const MAX_IMAGE_SIZE = 15 * 1024 * 1024
export async function readImageFile(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  const isFile = existsSync(validatedPath)
  if (!isFile) {
    throw new Error(`File ${path} does not exist.`)
  }
  const mimeType = mime.lookup(validatedPath)
  if (!mimeType || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mimeType)) {
    throw new Error(`File ${path} is not supported.`)
  }
  const fileStats = await stat(validatedPath)
  const fileSizeMB = fileStats.size / (1024 * 1024)
  if (fileStats.size > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image file too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB. Please use a smaller image file.`,
    )
  }
  return {
    path: validatedPath,
    mimeType,
    size: fileStats.size,
  }
}

export function registerReadImageFile(server: McpServer) {
  server.registerTool(
    "readImageFile",
    {
      title: "Read image file",
      description: dedent`
        Image file reader that converts images to base64 encoded strings with MIME type validation.

        Use cases:
        - Loading images for LLM to process
        - Retrieving image data for analysis or display
        - Converting workspace image files to base64 format

        How it works:
        - Validates file existence and MIME type before reading
        - Encodes file content as base64 string
        - Returns image data with correct MIME type for proper handling
        - Rejects unsupported formats with clear error messages

        Supported formats:
        - PNG (image/png)
        - JPEG/JPG (image/jpeg)
        - GIF (image/gif) - static only, animated not supported
        - WebP (image/webp)
        
        Notes:
        - Maximum file size: 15MB (larger files will be rejected)
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await readImageFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
