import {
  defaultMaxRetries,
  defaultTimeout,
  parseWithFriendlyError,
  startCommandInputSchema,
} from "@perstack/core"
import { getRuntimeVersion } from "@perstack/runner"
import { Command } from "commander"
import { resolveRunContext } from "./lib/context.js"
import { parseInteractiveToolCallResult } from "./lib/interactive.js"
import {
  getAllJobs,
  getCheckpointById,
  getCheckpointsWithDetails,
  getEventContents,
  getRecentExperts,
} from "./lib/run-manager.js"
import { dispatchToRuntime } from "./lib/runtime-dispatcher.js"
import { renderExecution } from "./tui/execution/index.js"
import { renderSelection } from "./tui/selection/index.js"
import type { CheckpointHistoryItem, JobHistoryItem } from "./tui/types/index.js"

const CONTINUE_TIMEOUT_MS = 60_000

export const startCommand = new Command()
  .command("start")
  .description("Start Perstack with interactive TUI")
  .argument("[expertKey]", "Expert key to run (optional, will prompt if not provided)")
  .argument("[query]", "Query to run (optional, will prompt if not provided)")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .option("--provider <provider>", "Provider to use")
  .option("--model <model>", "Model to use")
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
  .option(
    "--env-path <path>",
    "Path to the environment file (can be specified multiple times), default is .env and .env.local",
    (value: string, previous: string[]) => previous.concat(value),
    [] as string[],
  )
  .option(
    "--env <name>",
    "Environment variable name to pass to Docker runtime (can be specified multiple times)",
    (value: string, previous: string[]) => previous.concat(value),
    [] as string[],
  )
  .option("--verbose", "Enable verbose logging")
  .option("--continue", "Continue the most recent job with new query")
  .option("--continue-job <jobId>", "Continue the specified job with new query")
  .option(
    "--resume-from <checkpointId>",
    "Resume from a specific checkpoint (requires --continue or --continue-job)",
  )
  .option("-i, --interactive-tool-call-result", "Query is interactive tool call result")
  .option("--runtime <runtime>", "Execution runtime (docker, local, cursor, claude-code, gemini)")
  .option("--workspace <workspace>", "Workspace directory for Docker runtime")
  .action(async (expertKey, query, options) => {
    const input = parseWithFriendlyError(startCommandInputSchema, { expertKey, query, options })

    try {
      // Phase 1: Initialize context
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

      const runtime = input.options.runtime ?? perstackConfig.runtime ?? "docker"
      const maxSteps = input.options.maxSteps ?? perstackConfig.maxSteps
      const maxRetries = input.options.maxRetries ?? perstackConfig.maxRetries ?? defaultMaxRetries
      const timeout = input.options.timeout ?? perstackConfig.timeout ?? defaultTimeout

      // Prepare expert lists
      const configuredExperts = Object.keys(perstackConfig.experts ?? {}).map((key) => ({
        key,
        name: key,
      }))
      const recentExperts = getRecentExperts(10)

      // Prepare history jobs (only if browsing is needed)
      const showHistory = !input.expertKey && !input.query && !checkpoint
      const historyJobs: JobHistoryItem[] = showHistory
        ? getAllJobs().map((j) => ({
            jobId: j.id,
            status: j.status,
            expertKey: j.coordinatorExpertKey,
            totalSteps: j.totalSteps,
            startedAt: j.startedAt,
            finishedAt: j.finishedAt,
          }))
        : []

      // Phase 2: Selection - get expert, query, and optional checkpoint
      const selection = await renderSelection({
        showHistory,
        initialExpertKey: input.expertKey,
        initialQuery: input.query,
        initialCheckpoint: checkpoint
          ? {
              id: checkpoint.id,
              jobId: checkpoint.jobId,
              runId: checkpoint.runId,
              stepNumber: checkpoint.stepNumber,
              contextWindowUsage: checkpoint.contextWindowUsage ?? 0,
            }
          : undefined,
        configuredExperts,
        recentExperts,
        historyJobs,
        onLoadCheckpoints: async (j: JobHistoryItem): Promise<CheckpointHistoryItem[]> => {
          const checkpoints = getCheckpointsWithDetails(j.jobId)
          return checkpoints.map((cp) => ({ ...cp, jobId: j.jobId }))
        },
      })

      // Validate selection
      if (!selection.expertKey) {
        console.error("Expert key is required")
        return
      }
      if (!selection.query && !selection.checkpoint) {
        console.error("Query is required")
        return
      }

      // Resolve checkpoint if selected from TUI
      let currentCheckpoint = selection.checkpoint
        ? getCheckpointById(selection.checkpoint.jobId, selection.checkpoint.id)
        : checkpoint

      if (currentCheckpoint && currentCheckpoint.expert.key !== selection.expertKey) {
        console.error(
          `Checkpoint expert key ${currentCheckpoint.expert.key} does not match input expert key ${selection.expertKey}`,
        )
        return
      }

      // Phase 3: Execution loop
      let currentQuery: string | null = selection.query
      let currentJobId = currentCheckpoint?.jobId ?? input.options.jobId

      while (currentQuery !== null) {
        // Load historical events for resume
        const historicalEvents = currentCheckpoint
          ? await getEventContents(
              currentCheckpoint.jobId,
              currentCheckpoint.runId,
              currentCheckpoint.stepNumber,
            )
          : undefined

        // Start execution TUI
        const { result: executionResult, eventListener } = renderExecution({
          expertKey: selection.expertKey,
          query: currentQuery,
          config: {
            runtimeVersion: getRuntimeVersion(),
            model,
            maxSteps,
            maxRetries,
            timeout,
            contextWindowUsage: currentCheckpoint?.contextWindowUsage ?? 0,
            runtime,
          },
          continueTimeoutMs: CONTINUE_TIMEOUT_MS,
          historicalEvents,
        })

        // Run the expert
        const { checkpoint: runResult } = await dispatchToRuntime({
          setting: {
            jobId: currentJobId,
            expertKey: selection.expertKey,
            input:
              input.options.interactiveToolCallResult && currentCheckpoint
                ? parseInteractiveToolCallResult(currentQuery, currentCheckpoint)
                : { text: currentQuery },
            experts,
            model,
            providerConfig,
            reasoningBudget: input.options.reasoningBudget ?? perstackConfig.reasoningBudget,
            maxSteps: input.options.maxSteps ?? perstackConfig.maxSteps,
            maxRetries: input.options.maxRetries ?? perstackConfig.maxRetries,
            timeout: input.options.timeout ?? perstackConfig.timeout,
            perstackApiBaseUrl: perstackConfig.perstackApiBaseUrl,
            perstackApiKey: env.PERSTACK_API_KEY,
            perstackBaseSkillCommand: perstackConfig.perstackBaseSkillCommand,
            env,
            verbose: input.options.verbose,
          },
          checkpoint: currentCheckpoint,
          runtime,
          config: perstackConfig,
          eventListener,
          workspace: input.options.workspace,
          additionalEnvKeys: input.options.env,
        })

        // Wait for execution TUI to complete (user input or timeout)
        const result = await executionResult

        // Check if user wants to continue
        if (
          result.nextQuery &&
          (runResult.status === "completed" ||
            runResult.status === "stoppedByExceededMaxSteps" ||
            runResult.status === "stoppedByError")
        ) {
          currentQuery = result.nextQuery
          currentCheckpoint = runResult
          currentJobId = runResult.jobId
        } else {
          currentQuery = null
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      } else {
        console.error(error)
      }
    }
  })
