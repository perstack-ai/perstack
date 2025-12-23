import { createApiClient } from "@perstack/api-client"
import { Command } from "commander"
import { getPerstackConfig } from "./lib/perstack-toml.js"
import { renderStatus, type WizardVersionInfo } from "./tui/index.js"

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
        if (expertKey) {
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
        }

        const perstackConfig = await getPerstackConfig(options.config)
        const client = createApiClient({
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
            onFetchVersions: async (expertName: string): Promise<WizardVersionInfo[]> => {
              const versionsResult = await client.registry.experts.getVersions(expertName)
              if (!versionsResult.ok) {
                throw new Error(`Expert "${expertName}" not found in registry`)
              }
              const { versions } = versionsResult.data
              const versionInfos: WizardVersionInfo[] = []
              for (const v of versions) {
                const expertResult = await client.registry.experts.get(v.key)
                if (expertResult.ok && expertResult.data.type === "registryExpert") {
                  versionInfos.push({
                    key: v.key,
                    version: v.version ?? "unknown",
                    tags: v.tags,
                    status: expertResult.data.status,
                  })
                } else {
                  versionInfos.push({
                    key: v.key,
                    version: v.version ?? "unknown",
                    tags: v.tags,
                    status: "available",
                  })
                }
              }
              return versionInfos
            },
          })
          if (!result) {
            console.log("Cancelled")
            process.exit(0)
          }
          const updateResult = await client.registry.experts.update(result.expertKey, {
            status: result.status,
          })
          if (!updateResult.ok) {
            throw new Error(updateResult.error.message)
          }
          console.log(`Updated ${updateResult.data.key}`)
          console.log(`  Status: ${updateResult.data.status}`)
          return
        }
        const updateResult = await client.registry.experts.update(expertKey, {
          status: status as "available" | "deprecated" | "disabled",
        })
        if (!updateResult.ok) {
          throw new Error(updateResult.error.message)
        }
        console.log(`Updated ${updateResult.data.key}`)
        console.log(`  Status: ${updateResult.data.status}`)
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
