import { ApiV1Client, type CreateRegistryExpertInput } from "@perstack/api-client/v1"
import type { PerstackConfig } from "@perstack/core"
import { Command } from "commander"
import { getPerstackConfig } from "./lib/perstack-toml.js"
import { renderPublish } from "./tui/index.js"

type ConfigSkills = NonNullable<NonNullable<PerstackConfig["experts"]>[string]["skills"]>
type ApiSkills = CreateRegistryExpertInput["skills"]

function convertSkillsForApi(skills: ConfigSkills): ApiSkills {
  return Object.fromEntries(
    Object.entries(skills).map(([name, skill]) => {
      if (skill.type === "mcpStdioSkill") {
        const command = skill.command as "npx" | "uvx"
        if (command !== "npx" && command !== "uvx") {
          throw new Error(
            `Invalid command "${skill.command}" for skill "${name}". Must be "npx" or "uvx".`,
          )
        }
        return [
          name,
          {
            type: "mcpStdioSkill" as const,
            description: skill.description ?? `${name} skill`,
            rule: skill.rule,
            pick: skill.pick,
            omit: skill.omit,
            command,
            packageName: skill.packageName ?? name,
            requiredEnv: skill.requiredEnv,
          },
        ]
      }
      if (skill.type === "mcpSseSkill") {
        return [
          name,
          {
            type: "mcpSseSkill" as const,
            description: skill.description ?? `${name} skill`,
            rule: skill.rule,
            pick: skill.pick,
            omit: skill.omit,
            endpoint: skill.endpoint,
          },
        ]
      }
      return [
        name,
        {
          type: "interactiveSkill" as const,
          description: skill.description ?? `${name} skill`,
          rule: skill.rule,
          tools: Object.fromEntries(
            Object.entries(skill.tools).map(([toolName, tool]) => [
              toolName,
              {
                description: tool.description ?? `${toolName} tool`,
                inputJsonSchema: tool.inputJsonSchema,
              },
            ]),
          ),
        },
      ]
    }),
  )
}

export const publishCommand = new Command()
  .command("publish")
  .description("Publish an Expert to the registry")
  .argument("[expertName]", "Expert name to publish (prompts if not provided)")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option("--dry-run", "Validate without publishing")
  .action(
    async (expertName: string | undefined, options: { config?: string; dryRun?: boolean }) => {
      try {
        const perstackConfig = await getPerstackConfig(options.config)
        const experts = perstackConfig.experts
        if (!experts || Object.keys(experts).length === 0) {
          console.error("No experts defined in perstack.toml")
          process.exit(1)
        }
        const expertNames = Object.keys(experts)
        let selectedExpert: string
        if (expertName) {
          if (!experts[expertName]) {
            console.error(`Expert "${expertName}" not found in perstack.toml`)
            console.error(`Available experts: ${expertNames.join(", ")}`)
            process.exit(1)
          }
          selectedExpert = expertName
        } else {
          if (expertNames.length === 1) {
            selectedExpert = expertNames[0]
          } else {
            const result = await renderPublish({
              experts: expertNames.map((name) => ({
                name,
                description: experts[name].description,
              })),
            })
            if (!result) {
              console.log("Cancelled")
              process.exit(0)
            }
            selectedExpert = result
          }
        }
        const expert = experts[selectedExpert]
        const version = expert.version ?? "1.0.0"
        const payload: CreateRegistryExpertInput = {
          name: selectedExpert,
          version,
          minRuntimeVersion: "v1.0",
          description: expert.description ?? "",
          instruction: expert.instruction,
          skills: convertSkillsForApi(expert.skills ?? {}),
          delegates: expert.delegates ?? [],
          tags: ["latest"],
        }
        if (options.dryRun) {
          console.log("Dry run - would publish:")
          console.log(JSON.stringify(payload, null, 2))
          return
        }
        const client = new ApiV1Client({
          baseUrl: perstackConfig.perstackApiBaseUrl,
          apiKey: process.env.PERSTACK_API_KEY,
        })
        const { expert: published } = await client.registry.experts.create(payload)
        console.log(`Published ${published.key}`)
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message)
        } else {
          console.error(error)
        }
        process.exit(1)
      }
    },
  )
