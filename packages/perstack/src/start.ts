import {
  defaultMaxRetries,
  defaultTemperature,
  defaultTimeout,
  startCommandInputSchema,
} from "@perstack/core"
import { run, runtimeVersion } from "@perstack/runtime"
import type { CheckpointHistoryItem, EventHistoryItem, RunHistoryItem } from "@perstack/tui"
import { renderStart } from "@perstack/tui"
import { Command } from "commander"
import { resolveRunContext } from "./lib/context.js"
import { parseInteractiveToolCallResult } from "./lib/interactive.js"
import {
  getAllRuns,
  getCheckpointById,
  getCheckpointsWithDetails,
  getEventContents,
  getEventsWithDetails,
  getRecentExperts,
} from "./lib/run-manager.js"
export const startCommand = new Command()
  .command("start")
  .description("Start Perstack with interactive TUI")
  .argument("[expertKey]", "Expert key to run (optional, will prompt if not provided)")
  .argument("[query]", "Query to run (optional, will prompt if not provided)")
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
    const input = startCommandInputSchema.parse({ expertKey, query, options })
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
      const showHistory = !input.expertKey && !input.query && !checkpoint
      const needsQueryInput = !input.query && !checkpoint
      const configuredExperts = Object.keys(perstackConfig.experts ?? {}).map((key) => ({
        key,
        name: key,
      }))
      const recentExperts = await getRecentExperts(10)
      const historyRuns: RunHistoryItem[] = showHistory
        ? (await getAllRuns()).map((r) => ({
            runId: r.runId,
            expertKey: r.expertKey,
            model: r.model,
            inputText: r.input.text ?? "",
            startedAt: r.startedAt,
            updatedAt: r.updatedAt,
          }))
        : []
      const resumeState: { checkpoint: CheckpointHistoryItem | null } = { checkpoint: null }
      let resolveContinueQuery: ((query: string | null) => void) | null = null
      const temperature =
        input.options.temperature ?? perstackConfig.temperature ?? defaultTemperature
      const maxSteps = input.options.maxSteps ?? perstackConfig.maxSteps
      const maxRetries = input.options.maxRetries ?? perstackConfig.maxRetries ?? defaultMaxRetries
      const timeout = input.options.timeout ?? perstackConfig.timeout ?? defaultTimeout
      const result = await renderStart({
        showHistory,
        needsQueryInput,
        initialExpertName: input.expertKey,
        initialQuery: input.query,
        initialConfig: {
          runtimeVersion,
          model,
          temperature,
          maxSteps,
          maxRetries,
          timeout,
          contextWindowUsage: checkpoint?.contextWindowUsage ?? 0,
        },
        configuredExperts,
        recentExperts,
        historyRuns,
        onContinue: (query: string) => {
          if (resolveContinueQuery) {
            resolveContinueQuery(query)
            resolveContinueQuery = null
          }
        },
        onResumeFromCheckpoint: (cp: CheckpointHistoryItem) => {
          resumeState.checkpoint = cp
        },
        onLoadCheckpoints: async (r: RunHistoryItem): Promise<CheckpointHistoryItem[]> => {
          return await getCheckpointsWithDetails(r.runId)
        },
        onLoadEvents: async (
          r: RunHistoryItem,
          cp: CheckpointHistoryItem,
        ): Promise<EventHistoryItem[]> => {
          return await getEventsWithDetails(r.runId, cp.stepNumber)
        },
        onLoadHistoricalEvents: async (cp: CheckpointHistoryItem) => {
          return await getEventContents(cp.runId, cp.stepNumber)
        },
      })
      const finalExpertKey = result.expertKey || input.expertKey
      let finalQuery = result.query || input.query
      if (!finalExpertKey) {
        console.error("Expert key is required")
        return
      }
      let currentCheckpoint =
        resumeState.checkpoint !== null
          ? await getCheckpointById(resumeState.checkpoint.runId, resumeState.checkpoint.id)
          : checkpoint
      if (currentCheckpoint && currentCheckpoint.expert.key !== finalExpertKey) {
        console.error(
          `Checkpoint expert key ${currentCheckpoint.expert.key} does not match input expert key ${finalExpertKey}`,
        )
        return
      }
      if (!finalQuery && !currentCheckpoint) {
        console.error("Query is required")
        return
      }
      let currentRunId = currentCheckpoint?.runId ?? input.options.runId
      while (true) {
        const runResult = await run(
          {
            setting: {
              runId: currentRunId,
              expertKey: finalExpertKey,
              input:
                input.options.interactiveToolCallResult && currentCheckpoint
                  ? parseInteractiveToolCallResult(finalQuery || "", currentCheckpoint)
                  : { text: finalQuery },
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
            checkpoint: currentCheckpoint,
          },
          { eventListener: result.eventListener },
        )
        if (
          runResult.status === "completed" ||
          runResult.status === "stoppedByExceededMaxSteps" ||
          runResult.status === "stoppedByError"
        ) {
          const nextQuery = await new Promise<string | null>((resolve) => {
            resolveContinueQuery = resolve
            setTimeout(() => {
              if (resolveContinueQuery === resolve) {
                resolveContinueQuery = null
                resolve(null)
              }
            }, 60000)
          })
          if (nextQuery) {
            finalQuery = nextQuery
            currentCheckpoint = runResult
            currentRunId = runResult.runId
          } else {
            break
          }
        } else {
          break
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
