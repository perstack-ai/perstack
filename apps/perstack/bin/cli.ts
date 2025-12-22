#!/usr/bin/env node

import { Command } from "commander"
import packageJson from "../package.json" with { type: "json" }
import { installCommand } from "../src/install.js"
import { logCommand } from "../src/log.js"
import { publishCommand } from "../src/publish.js"
import { runCommand } from "../src/run.js"
import { startCommand } from "../src/start.js"
import { statusCommand } from "../src/status.js"
import { tagCommand } from "../src/tag.js"
import { unpublishCommand } from "../src/unpublish.js"

const program = new Command()
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .addCommand(startCommand)
  .addCommand(runCommand)
  .addCommand(logCommand)
  .addCommand(installCommand)
  .addCommand(publishCommand)
  .addCommand(unpublishCommand)
  .addCommand(tagCommand)
  .addCommand(statusCommand)
program.parse()
