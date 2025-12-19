import { existsSync } from "node:fs"
import { stat } from "node:fs/promises"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import mime from "mime-types"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

const MAX_PDF_SIZE = 30 * 1024 * 1024
export async function readPdfFile(input: { path: string }) {
  const { path } = input
  const validatedPath = await validatePath(path)
  const isFile = existsSync(validatedPath)
  if (!isFile) {
    throw new Error(`File ${path} does not exist.`)
  }
  const mimeType = mime.lookup(validatedPath)
  if (mimeType !== "application/pdf") {
    throw new Error(`File ${path} is not a PDF file.`)
  }
  const fileStats = await stat(validatedPath)
  const fileSizeMB = fileStats.size / (1024 * 1024)
  if (fileStats.size > MAX_PDF_SIZE) {
    throw new Error(
      `PDF file too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is ${MAX_PDF_SIZE / (1024 * 1024)}MB. Please use a smaller PDF file.`,
    )
  }
  return {
    path: validatedPath,
    mimeType,
    size: fileStats.size,
  }
}

export function registerReadPdfFile(server: McpServer) {
  server.registerTool(
    "readPdfFile",
    {
      title: "Read PDF file",
      description: dedent`
        PDF file reader that converts documents to base64 encoded resources.

        Use cases:
        - Extracting content from PDF documents for analysis
        - Loading PDF files for LLM processing
        - Retrieving PDF data for conversion or manipulation

        How it works:
        - Validates file existence and MIME type (application/pdf)
        - Encodes PDF content as base64 blob
        - Returns as resource type with proper MIME type and URI
        - Rejects non-PDF files with clear error messages

        Notes:
        - Returns entire PDF content, no page range support
        - Maximum file size: 30MB (larger files will be rejected)
        - Text extraction not performed, returns raw PDF data
      `,
      inputSchema: {
        path: z.string(),
      },
    },
    async (input: { path: string }) => {
      try {
        return successToolResult(await readPdfFile(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
