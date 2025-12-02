import { ApiV1Client } from "@perstack/api-client/v1"
import { renderStatus, type StatusVersionInfo } from "@perstack/tui"
import { Command } from "commander"
import { getPerstackConfig } from "./lib/perstack-toml.js"

export const statusCommand = new Command()
  .command("status")
  .description("Change the status of an Expert version")
  .argument("[expertKey]", "Expert key with version (e.g., my-expert@1.0.0)")
  .argument("[status]", "New status (available, deprecated, disabled)")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .action(
    async (
      expertKey: string | undefined,
      status: string | undefined,
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
          const result = await renderStatus({
            experts: expertNames.map((name) => ({
              name,
              description: experts[name].description,
            })),
            onFetchVersions: async (expertName: string): Promise<StatusVersionInfo[]> => {
              try {
                const { versions } = await client.registry.experts.getVersions({
                  expertKey: expertName,
                })
                const versionInfos: StatusVersionInfo[] = []
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
            status: result.status,
          })
          console.log(`Updated ${expert.key}`)
          console.log(`  Status: ${expert.status}`)
          return
        }
        if (!expertKey.includes("@")) {
          console.error("Expert key must include version (e.g., my-expert@1.0.0)")
          process.exit(1)
        }
        if (!status) {
          console.error("Please provide a status (available, deprecated, disabled)")
          process.exit(1)
        }
        if (!["available", "deprecated", "disabled"].includes(status)) {
          console.error("Invalid status. Must be: available, deprecated, or disabled")
          process.exit(1)
        }
        const { expert } = await client.registry.experts.update({
          expertKey,
          status: status as "available" | "deprecated" | "disabled",
        })
        console.log(`Updated ${expert.key}`)
        console.log(`  Status: ${expert.status}`)
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
