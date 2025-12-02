import { runCommandInputSchema } from "@perstack/core"
import { run } from "@perstack/runtime"
import { Command } from "commander"
import { resolveRunContext } from "./lib/context.js"
import { parseInteractiveToolCallResult } from "./lib/interactive.js"

export const runCommand = new Command()
  .command("run")
  .description("Run Perstack with JSON output")
  .argument("<expertKey>", "Expert key to run")
  .argument("<query>", "Query to run")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option("--provider <provider>", "Provider to use")
  .option("--model <model>", "Model to use")
  .option("--temperature <temperature>", "Temperature for the model, default is 0.3")
  .option(
    "--max-steps <maxSteps>",
    "Maximum number of steps to run, default is undefined (no limit)",
  )
  .option("--max-retries <maxRetries>", "Maximum number of generation retries, default is 5")
  .option(
    "--timeout <timeout>",
    "Timeout for each generation in milliseconds, default is 60000 (1 minute)",
  )
  .option("--run-id <runId>", "Run ID for identifying the run")
  .option("--env-path <envPath...>", "Path to the environment file, default is .env and .env.local")
  .option("--verbose", "Enable verbose logging")
  .option("--continue", "Continue the most recent run with new query")
  .option("--continue-run <runId>", "Continue the specified run with new query")
  .option("--resume-from <checkpointId>", "Resume from a specific checkpoint")
  .option("-i, --interactive-tool-call-result", "Query is interactive tool call result")
  .action(async (expertKey, query, options) => {
    const input = runCommandInputSchema.parse({ expertKey, query, options })

    try {
      const { perstackConfig, checkpoint, env, providerConfig, model, experts } =
        await resolveRunContext({
          configPath: input.options.config,
          provider: input.options.provider,
          model: input.options.model,
          envPath: input.options.envPath,
          continue: input.options.continue,
          continueRun: input.options.continueRun,
          resumeFrom: input.options.resumeFrom,
          expertKey: input.expertKey,
        })

      await run({
        setting: {
          runId: checkpoint?.runId ?? input.options.runId,
          expertKey: input.expertKey,
          input:
            input.options.interactiveToolCallResult && checkpoint
              ? parseInteractiveToolCallResult(input.query, checkpoint)
              : { text: input.query },
          experts,
          model,
          providerConfig,
          temperature: input.options.temperature ?? perstackConfig.temperature,
          maxSteps: input.options.maxSteps ?? perstackConfig.maxSteps,
          maxRetries: input.options.maxRetries ?? perstackConfig.maxRetries,
          timeout: input.options.timeout ?? perstackConfig.timeout,
          perstackApiBaseUrl: perstackConfig.perstackApiBaseUrl,
          perstackApiKey: env.PERSTACK_API_KEY,
          perstackBaseSkillCommand: perstackConfig.perstackBaseSkillCommand,
          env,
        },
        checkpoint,
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      } else {
        console.error(error)
      }
      process.exit(1)
    }
  })
