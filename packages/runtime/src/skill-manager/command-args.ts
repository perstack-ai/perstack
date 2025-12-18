import type { McpStdioSkill } from "@perstack/core"

export interface CommandArgs {
  command: string
  args: string[]
}

/**
 * Parse and validate command arguments from a McpStdioSkill.
 * Ensures either packageName or args is provided (not both, not neither).
 * Adds -y flag for npx commands if not present.
 */
export function getCommandArgs(skill: McpStdioSkill): CommandArgs {
  const { name, command, packageName, args } = skill

  if (!packageName && (!args || args.length === 0)) {
    throw new Error(`Skill ${name} has no packageName or args. Please provide one of them.`)
  }

  if (packageName && args && args.length > 0) {
    throw new Error(`Skill ${name} has both packageName and args. Please provide only one of them.`)
  }

  let newArgs = args && args.length > 0 ? args : [packageName!]

  // Add -y flag for npx to auto-confirm package installation
  if (command === "npx" && !newArgs.includes("-y")) {
    newArgs = ["-y", ...newArgs]
  }

  return { command, args: newArgs }
}
