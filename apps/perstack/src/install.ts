import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { type ApiRegistryExpert, ApiV1Client } from "@perstack/api-client/v1"
import {
  defaultPerstackApiBaseUrl,
  type Expert,
  expertSchema,
  type Lockfile,
  type LockfileExpert,
  type PerstackConfig,
  type Skill,
} from "@perstack/core"
import { collectToolDefinitionsForExpert } from "@perstack/runtime"
import { Command } from "commander"
import TOML from "smol-toml"
import { getEnv } from "./lib/get-env.js"
import { getPerstackConfig } from "./lib/perstack-toml.js"

async function findConfigPath(configPath?: string): Promise<string> {
  if (configPath) {
    return path.resolve(process.cwd(), configPath)
  }
  return await findConfigPathRecursively(process.cwd())
}

async function findConfigPathRecursively(cwd: string): Promise<string> {
  const configPath = path.resolve(cwd, "perstack.toml")
  try {
    await readFile(configPath)
    return configPath
  } catch {
    if (cwd === path.parse(cwd).root) {
      throw new Error("perstack.toml not found. Create one or specify --config path.")
    }
    return await findConfigPathRecursively(path.dirname(cwd))
  }
}

function toRuntimeExpert(key: string, expert: ApiRegistryExpert): Expert {
  const skills: Record<string, Skill> = Object.fromEntries(
    Object.entries(expert.skills).map(([name, skill]) => {
      switch (skill.type) {
        case "mcpStdioSkill":
          return [name, { ...skill, name }]
        case "mcpSseSkill":
          return [name, { ...skill, name }]
        case "interactiveSkill":
          return [name, { ...skill, name }]
        default: {
          throw new Error(`Unknown skill type: ${(skill as { type: string }).type}`)
        }
      }
    }),
  )
  return { ...expert, key, skills }
}

function configExpertToExpert(
  key: string,
  configExpert: NonNullable<PerstackConfig["experts"]>[string],
): Expert {
  return expertSchema.parse({
    key,
    name: key,
    version: configExpert.version ?? "1.0.0",
    description: configExpert.description,
    instruction: configExpert.instruction,
    skills: configExpert.skills,
    delegates: configExpert.delegates,
    tags: configExpert.tags,
    providerTools: configExpert.providerTools,
    providerSkills: configExpert.providerSkills,
    providerToolOptions: configExpert.providerToolOptions,
  })
}

async function resolveAllExperts(
  config: PerstackConfig,
  env: Record<string, string>,
): Promise<Record<string, Expert>> {
  const experts: Record<string, Expert> = {}
  const apiClient = new ApiV1Client({
    baseUrl: config.perstackApiBaseUrl ?? defaultPerstackApiBaseUrl,
    apiKey: env.PERSTACK_API_KEY,
  })
  for (const [key, configExpert] of Object.entries(config.experts ?? {})) {
    experts[key] = configExpertToExpert(key, configExpert)
  }
  const toResolve = new Set<string>()
  for (const expert of Object.values(experts)) {
    for (const delegateKey of expert.delegates) {
      if (!experts[delegateKey]) {
        toResolve.add(delegateKey)
      }
    }
  }
  while (toResolve.size > 0) {
    const delegateKey = toResolve.values().next().value
    if (!delegateKey) break
    toResolve.delete(delegateKey)
    if (experts[delegateKey]) continue
    try {
      const { expert: registryExpert } = await apiClient.registry.experts.get({
        expertKey: delegateKey,
      })
      experts[delegateKey] = toRuntimeExpert(delegateKey, registryExpert)
      for (const nestedDelegate of registryExpert.delegates) {
        if (!experts[nestedDelegate]) {
          toResolve.add(nestedDelegate)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to resolve delegate "${delegateKey}": ${message}`)
    }
  }
  return experts
}

function expertToLockfileExpert(
  expert: Expert,
  toolDefinitions: {
    skillName: string
    name: string
    description?: string
    inputSchema: Record<string, unknown>
  }[],
): LockfileExpert {
  return {
    key: expert.key,
    name: expert.name,
    version: expert.version,
    description: expert.description,
    instruction: expert.instruction,
    skills: expert.skills,
    delegates: expert.delegates,
    tags: expert.tags,
    toolDefinitions,
  }
}

function generateLockfileToml(lockfile: Lockfile): string {
  return TOML.stringify(lockfile)
}

export const installCommand = new Command()
  .command("install")
  .description("Generate perstack.lock with tool definitions for faster startup")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option(
    "--env-path <path>",
    "Path to the environment file (can be specified multiple times)",
    (value: string, previous: string[]) => previous.concat(value),
    [] as string[],
  )
  .action(async (options) => {
    try {
      const configPath = await findConfigPath(options.config)
      const config = await getPerstackConfig(options.config)
      const envPath =
        options.envPath && options.envPath.length > 0
          ? options.envPath
          : (config.envPath ?? [".env", ".env.local"])
      const env = getEnv(envPath)
      console.log("Resolving experts...")
      const experts = await resolveAllExperts(config, env)
      console.log(`Found ${Object.keys(experts).length} expert(s)`)
      const lockfileExperts: Record<string, LockfileExpert> = {}
      for (const [key, expert] of Object.entries(experts)) {
        console.log(`Collecting tool definitions for ${key}...`)
        const toolDefinitions = await collectToolDefinitionsForExpert(expert, {
          env,
          perstackBaseSkillCommand: config.perstackBaseSkillCommand,
        })
        console.log(`  Found ${toolDefinitions.length} tool(s)`)
        lockfileExperts[key] = expertToLockfileExpert(expert, toolDefinitions)
      }
      const lockfile: Lockfile = {
        version: "1",
        generatedAt: Date.now(),
        configPath: path.basename(configPath),
        experts: lockfileExperts,
      }
      const lockfilePath = path.join(path.dirname(configPath), "perstack.lock")
      const lockfileContent = generateLockfileToml(lockfile)
      await writeFile(lockfilePath, lockfileContent, "utf-8")
      console.log(`Generated ${lockfilePath}`)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`)
      } else {
        console.error(error)
      }
      process.exit(1)
    }
  })
