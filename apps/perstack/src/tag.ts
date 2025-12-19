import { ApiV1Client } from "@perstack/api-client/v1"
import { Command } from "commander"
import { getPerstackConfig } from "./lib/perstack-toml.js"
import { renderTag, type WizardVersionInfo } from "./tui/index.js"

export const tagCommand = new Command()
  .command("tag")
  .description("Add or update tags on an Expert version")
  .argument("[expertKey]", "Expert key with version (e.g., my-expert@1.0.0)")
  .argument("[tags...]", "Tags to set (e.g., stable beta)")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .action(
    async (
      expertKey: string | undefined,
      tags: string[] | undefined,
      options: { config?: string },
    ) => {
      try {
        const perstackConfig = await getPerstackConfig(options.config)
        const client = new ApiV1Client({
          baseUrl: perstackConfig.perstackApiBaseUrl,
          apiKey: process.env.PERSTACK_API_KEY,
        })
        if (!expertKey) {
          const experts = perstackConfig.experts
          if (!experts || Object.keys(experts).length === 0) {
            console.error("No experts defined in perstack.toml")
            process.exit(1)
          }
          const expertNames = Object.keys(experts)
          const result = await renderTag({
            experts: expertNames.map((name) => ({
              name,
              description: experts[name].description,
            })),
            onFetchVersions: async (expertName: string): Promise<WizardVersionInfo[]> => {
              try {
                const { versions } = await client.registry.experts.getVersions({
                  expertKey: expertName,
                })
                const versionInfos: WizardVersionInfo[] = []
                for (const v of versions) {
                  try {
                    const { expert: fullExpert } = await client.registry.experts.get({
                      expertKey: v.key,
                    })
                    if (fullExpert.type === "registryExpert") {
                      versionInfos.push({
                        key: v.key,
                        version: v.version ?? "unknown",
                        tags: v.tags,
                        status: fullExpert.status,
                      })
                    }
                  } catch {
                    versionInfos.push({
                      key: v.key,
                      version: v.version ?? "unknown",
                      tags: v.tags,
                      status: "available",
                    })
                  }
                }
                return versionInfos
              } catch {
                throw new Error(`Expert "${expertName}" not found in registry`)
              }
            },
          })
          if (!result) {
            console.log("Cancelled")
            process.exit(0)
          }
          const { expert } = await client.registry.experts.update({
            expertKey: result.expertKey,
            tags: result.tags,
          })
          console.log(`Updated ${expert.key}`)
          console.log(`  Tags: ${expert.tags.length > 0 ? expert.tags.join(", ") : "(none)"}`)
          return
        }
        if (!expertKey.includes("@")) {
          console.error("Expert key must include version (e.g., my-expert@1.0.0)")
          process.exit(1)
        }
        if (!tags || tags.length === 0) {
          console.error("Please provide tags to set")
          process.exit(1)
        }
        const { expert } = await client.registry.experts.update({
          expertKey,
          tags,
        })
        console.log(`Updated ${expert.key}`)
        console.log(`  Tags: ${expert.tags.length > 0 ? expert.tags.join(", ") : "(none)"}`)
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
