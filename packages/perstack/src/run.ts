import type { RunEvent, RuntimeEvent } from "@perstack/core"
import { parseWithFriendlyError, runCommandInputSchema } from "@perstack/core"
import { Command } from "commander"
import { resolveRunContext } from "./lib/context.js"
import {
  parseInteractiveToolCallResult,
  parseInteractiveToolCallResultJson,
} from "./lib/interactive.js"
import { dispatchToRuntime } from "./lib/runtime-dispatcher.js"

const defaultEventListener = (event: RunEvent | RuntimeEvent) => console.log(JSON.stringify(event))

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
  .option("--job-id <jobId>", "Job ID for identifying the job")
  .option("--run-id <runId>", "Run ID for identifying the run")
  .option("--env-path <envPath...>", "Path to the environment file, default is .env and .env.local")
  .option("--verbose", "Enable verbose logging")
  .option("--continue", "Continue the most recent job with new query")
  .option("--continue-job <jobId>", "Continue the specified job with new query")
  .option(
    "--resume-from <checkpointId>",
    "Resume from a specific checkpoint (requires --continue or --continue-job)",
  )
  .option("-i, --interactive-tool-call-result", "Query is interactive tool call result")
  .option("--runtime <runtime>", "Execution runtime (perstack, cursor, claude-code, gemini)")
  .option("--workspace <workspace>", "Workspace directory for Docker runtime")
  .action(async (expertKey, query, options) => {
    const input = parseWithFriendlyError(runCommandInputSchema, { expertKey, query, options })
    try {
      const { perstackConfig, checkpoint, env, providerConfig, model, experts } =
        await resolveRunContext({
          configPath: input.options.config,
          provider: input.options.provider,
          model: input.options.model,
          envPath: input.options.envPath,
          continue: input.options.continue,
          continueJob: input.options.continueJob,
          resumeFrom: input.options.resumeFrom,
          expertKey: input.expertKey,
        })
      const runtime = input.options.runtime ?? perstackConfig.runtime ?? "perstack"
      await dispatchToRuntime({
        setting: {
          jobId: checkpoint?.jobId ?? input.options.jobId,
          runId: checkpoint?.runId ?? input.options.runId,
          expertKey: input.expertKey,
          input: input.options.interactiveToolCallResult
            ? (parseInteractiveToolCallResultJson(input.query) ??
              (checkpoint
                ? parseInteractiveToolCallResult(input.query, checkpoint)
                : { text: input.query }))
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
          proxyUrl: process.env.PERSTACK_PROXY_URL,
          verbose: input.options.verbose,
        },
        checkpoint,
        runtime,
        config: perstackConfig,
        eventListener: defaultEventListener,
        workspace: input.options.workspace,
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
