import { ApiV1Client } from "@perstack/api-client/v1"
import { renderUnpublish, type WizardVersionInfo } from "@perstack/tui"
import { Command } from "commander"
import { getPerstackConfig } from "./lib/perstack-toml.js"
export const unpublishCommand = new Command()
  .command("unpublish")
  .description("Remove an Expert version from the registry")
  .argument("[expertKey]", "Expert key with version (e.g., my-expert@1.0.0)")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option("--force", "Skip confirmation prompt (required for CLI mode)")
  .action(async (expertKey: string | undefined, options: { config?: string; force?: boolean }) => {
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
        const result = await renderUnpublish({
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
        await client.registry.experts.delete({ expertKey: result.expertKey })
        console.log(`Unpublished ${result.expertKey}`)
        return
      }
      if (!expertKey.includes("@")) {
        console.error("Expert key must include version (e.g., my-expert@1.0.0)")
        process.exit(1)
      }
      if (!options.force) {
        console.error(`This will permanently remove ${expertKey} from the registry.`)
        console.error("Use --force to confirm, or run without arguments for interactive mode.")
        process.exit(1)
      }
      await client.registry.experts.delete({ expertKey })
      console.log(`Unpublished ${expertKey}`)
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      } else {
        console.error(error)
      }
      process.exit(1)
    }
  })
