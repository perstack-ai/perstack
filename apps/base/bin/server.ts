#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { Command } from "commander"
import packageJson from "../package.json" with { type: "json" }
import { createBaseServer } from "../src/server.js"

async function main() {
  const program = new Command()
  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version, "-v, --version", "display the version number")
    .option("--verbose", "verbose output")
    .action(async () => {
      const server = createBaseServer()
      const transport = new StdioServerTransport()
      console.error("Running @perstack/base version", packageJson.version)
      await server.connect(transport)
    })
  program.parse()
}
main()
