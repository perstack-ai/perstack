#!/usr/bin/env node

import type { Checkpoint, RunEvent, RuntimeEvent } from "@perstack/core"
import { parseWithFriendlyError, runCommandInputSchema } from "@perstack/core"
import { Command } from "commander"
import pkg from "../package.json" with { type: "json" }
import { resolveRunContext } from "../src/cli/context.js"
import { run } from "../src/run.js"

const defaultEventListener = (event: RunEvent | RuntimeEvent) => console.log(JSON.stringify(event))

const checkpointStore = new Map<string, Checkpoint>()
const storeCheckpoint = async (checkpoint: Checkpoint) => {
  checkpointStore.set(checkpoint.id, checkpoint)
}
const retrieveCheckpoint = async (_jobId: string, checkpointId: string) => {
  const checkpoint = checkpointStore.get(checkpointId)
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${checkpointId}`)
  }
  return checkpoint
}

const program = new Command()
  .name("perstack-runtime")
  .description("Perstack Runtime CLI - Execute Experts directly")
  .version(pkg.version)

program
  .command("run")
  .description("Run an Expert with JSON event output")
  .argument("<expertKey>", "Expert key to run")
  .argument("<query>", "Query to run")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option("--provider <provider>", "Provider to use")
  .option("--model <model>", "Model to use")
  .option("--temperature <temperature>", "Temperature for the model, default is 0.3")
  .option(
    "--reasoning-budget <budget>",
    "Reasoning budget for native LLM reasoning (minimal, low, medium, high, or token count)",
  )
  .option(
    "--max-steps <maxSteps>",
    "Maximum number of steps to run, default is undefined (no limit)",
  )
  .option("--max-retries <maxRetries>", "Maximum number of generation retries, default is 5")
  .option(
    "--timeout <timeout>",
    "Timeout for each generation in milliseconds, default is 60000 (1 minute)",
  )
  .option("--job-id <jobId>", "Job ID for identifying the job")
  .option("--run-id <runId>", "Run ID for identifying the run")
  .option(
    "--env-path <path>",
    "Path to the environment file (can be specified multiple times), default is .env and .env.local",
    (value: string, previous: string[]) => previous.concat(value),
    [] as string[],
  )
  .option("--verbose", "Enable verbose logging")
  .action(async (expertKey, query, options) => {
    const input = parseWithFriendlyError(runCommandInputSchema, { expertKey, query, options })
    try {
      const { perstackConfig, env, providerConfig, model, experts } = await resolveRunContext({
        configPath: input.options.config,
        provider: input.options.provider,
        model: input.options.model,
        envPath: input.options.envPath,
      })
      await run(
        {
          setting: {
            jobId: input.options.jobId,
            runId: input.options.runId,
            expertKey: input.expertKey,
            input: { text: input.query },
            experts,
            model,
            providerConfig,
            temperature: input.options.temperature ?? perstackConfig.temperature,
            reasoningBudget: input.options.reasoningBudget ?? perstackConfig.reasoningBudget,
            maxSteps: input.options.maxSteps ?? perstackConfig.maxSteps,
            maxRetries: input.options.maxRetries ?? perstackConfig.maxRetries,
            timeout: input.options.timeout ?? perstackConfig.timeout,
            perstackApiBaseUrl: perstackConfig.perstackApiBaseUrl,
            perstackApiKey: env.PERSTACK_API_KEY,
            perstackBaseSkillCommand: perstackConfig.perstackBaseSkillCommand,
            env,
            proxyUrl: process.env.PERSTACK_PROXY_URL,
            verbose: input.options.verbose,
          },
        },
        { eventListener: defaultEventListener, storeCheckpoint, retrieveCheckpoint },
      )
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      } else {
        console.error(error)
      }
      process.exit(1)
    }
  })

program.parse()
