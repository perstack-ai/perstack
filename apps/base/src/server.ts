import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import packageJson from "../package.json" with { type: "json" }
import { registerAppendTextFile } from "./tools/append-text-file.js"
import { registerAttemptCompletion } from "./tools/attempt-completion.js"
import { registerCreateDirectory } from "./tools/create-directory.js"
import { registerDeleteDirectory } from "./tools/delete-directory.js"
import { registerDeleteFile } from "./tools/delete-file.js"
import { registerEditTextFile } from "./tools/edit-text-file.js"
import { registerExec } from "./tools/exec.js"
import { registerGetFileInfo } from "./tools/get-file-info.js"
import { registerHealthCheck } from "./tools/health-check.js"
import { registerListDirectory } from "./tools/list-directory.js"
import { registerMoveFile } from "./tools/move-file.js"
import { registerReadImageFile } from "./tools/read-image-file.js"
import { registerReadPdfFile } from "./tools/read-pdf-file.js"
import { registerReadTextFile } from "./tools/read-text-file.js"
import { registerClearTodo, registerTodo } from "./tools/todo.js"
import { registerWriteTextFile } from "./tools/write-text-file.js"

/** Base skill name */
export const BASE_SKILL_NAME = packageJson.name

/** Base skill version */
export const BASE_SKILL_VERSION = packageJson.version

/**
 * Register all base skill tools on an MCP server.
 * This is useful for both standalone and in-process server creation.
 */
export function registerAllTools(server: McpServer): void {
  registerAttemptCompletion(server)
  registerTodo(server)
  registerClearTodo(server)
  registerExec(server)
  registerGetFileInfo(server)
  registerHealthCheck(server)
  registerReadTextFile(server)
  registerReadImageFile(server)
  registerReadPdfFile(server)
  registerWriteTextFile(server)
  registerAppendTextFile(server)
  registerEditTextFile(server)
  registerMoveFile(server)
  registerDeleteFile(server)
  registerListDirectory(server)
  registerCreateDirectory(server)
  registerDeleteDirectory(server)
}

/**
 * Create a base skill MCP server with all tools registered.
 * Used by the runtime for in-process execution via InMemoryTransport.
 */
export function createBaseServer(): McpServer {
  const server = new McpServer(
    {
      name: BASE_SKILL_NAME,
      version: BASE_SKILL_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )
  registerAllTools(server)
  return server
}
