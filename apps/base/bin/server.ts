#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { Command } from "commander"
import packageJson from "../package.json" with { type: "json" }
import { registerAppendTextFile } from "../src/tools/append-text-file.js"
import { registerAttemptCompletion } from "../src/tools/attempt-completion.js"
import { registerCreateDirectory } from "../src/tools/create-directory.js"
import { registerDeleteDirectory } from "../src/tools/delete-directory.js"
import { registerDeleteFile } from "../src/tools/delete-file.js"
import { registerEditTextFile } from "../src/tools/edit-text-file.js"
import { registerExec } from "../src/tools/exec.js"
import { registerGetFileInfo } from "../src/tools/get-file-info.js"
import { registerHealthCheck } from "../src/tools/health-check.js"
import { registerListDirectory } from "../src/tools/list-directory.js"
import { registerMoveFile } from "../src/tools/move-file.js"
import { registerReadImageFile } from "../src/tools/read-image-file.js"
import { registerReadPdfFile } from "../src/tools/read-pdf-file.js"
import { registerReadTextFile } from "../src/tools/read-text-file.js"
import { registerThink } from "../src/tools/think.js"
import { registerClearTodo, registerTodo } from "../src/tools/todo.js"
import { registerWriteTextFile } from "../src/tools/write-text-file.js"

async function main() {
  const program = new Command()
  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version, "-v, --version", "display the version number")
    .option("--verbose", "verbose output")
    .action(async () => {
      const server = new McpServer(
        {
          name: packageJson.name,
          version: packageJson.version,
        },
        {
          capabilities: {
            tools: {},
          },
        },
      )
      registerAttemptCompletion(server)
      registerThink(server)
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
      const transport = new StdioServerTransport()
      console.error("Running @perstack/base version", packageJson.version)
      await server.connect(transport)
    })
  program.parse()
}
main()
