import { FileSystemStorage } from "@perstack/filesystem-storage"
import { Command } from "commander"
import {
  applyFilters,
  createLogDataFetcher,
  createStorageAdapter,
  createSummary,
  type FilterOptions,
  type FormatterOptions,
  formatJson,
  formatTerminal,
  type LogCommandOptions,
  type LogOutput,
  parseFilterExpression,
  parseStepFilter,
} from "./lib/log/index.js"

export const logCommand = new Command()
  .command("log")
  .description("View execution history and events for debugging")
  .option("--job <jobId>", "Show events for a specific job")
  .option("--run <runId>", "Show events for a specific run")
  .option("--checkpoint <checkpointId>", "Show checkpoint details")
  .option("--step <step>", "Filter by step number (e.g., 5, >5, 1-10)")
  .option("--type <type>", "Filter by event type")
  .option("--errors", "Show error-related events only")
  .option("--tools", "Show tool call events only")
  .option("--delegations", "Show delegation events only")
  .option("--filter <expression>", "Simple filter expression")
  .option("--json", "Output as JSON")
  .option("--pretty", "Pretty-print JSON output")
  .option("--verbose", "Show full event details")
  .option("--limit <n>", "Limit number of results", (val) => parseInt(val, 10))
  .option("--context <n>", "Include N events before/after matches", (val) => parseInt(val, 10))
  .option("--messages", "Show message history for checkpoint")
  .option("--summary", "Show summarized view")
  .option("--config <configPath>", "Path to perstack.toml config file")
  .action(async (options: LogCommandOptions) => {
    try {
      const storagePath = process.env.PERSTACK_STORAGE_PATH ?? `${process.cwd()}/perstack`
      const storage = new FileSystemStorage({ basePath: storagePath })
      const adapter = createStorageAdapter(storage, storagePath)
      const fetcher = createLogDataFetcher(adapter)
      const filterOptions = buildFilterOptions(options)
      const formatterOptions = buildFormatterOptions(options)
      const output = await buildOutput(fetcher, options, filterOptions)
      if (!output) {
        console.log("No data found")
        return
      }
      const formatted = formatterOptions.json
        ? formatJson(output, formatterOptions)
        : formatTerminal(output, formatterOptions)
      console.log(formatted)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`)
      } else {
        console.error("An unexpected error occurred")
      }
      process.exit(1)
    }
  })

function buildFilterOptions(options: LogCommandOptions): FilterOptions {
  const filterOptions: FilterOptions = {}
  if (options.step) {
    filterOptions.step = parseStepFilter(options.step)
  }
  if (options.type) {
    filterOptions.type = options.type
  }
  if (options.errors) {
    filterOptions.errors = true
  }
  if (options.tools) {
    filterOptions.tools = true
  }
  if (options.delegations) {
    filterOptions.delegations = true
  }
  if (options.filter) {
    filterOptions.filterExpression = parseFilterExpression(options.filter)
  }
  if (options.limit !== undefined) {
    filterOptions.limit = options.limit
  }
  if (options.context !== undefined) {
    filterOptions.context = options.context
  }
  return filterOptions
}

function buildFormatterOptions(options: LogCommandOptions): FormatterOptions {
  return {
    json: options.json ?? false,
    pretty: options.pretty ?? false,
    verbose: options.verbose ?? false,
    messages: options.messages ?? false,
    summary: options.summary ?? false,
  }
}

async function buildOutput(
  fetcher: ReturnType<typeof createLogDataFetcher>,
  options: LogCommandOptions,
  filterOptions: FilterOptions,
): Promise<LogOutput | null> {
  if (options.checkpoint) {
    const jobId = options.job
    if (!jobId) {
      const latestJob = await fetcher.getLatestJob()
      if (!latestJob) {
        return null
      }
      const checkpoint = await fetcher.getCheckpoint(latestJob.id, options.checkpoint)
      const events = await fetcher.getEvents(latestJob.id, checkpoint.runId)
      const filteredEvents = applyFilters(events, filterOptions)
      return {
        job: latestJob,
        checkpoint,
        events: filteredEvents,
        summary: createSummary(filteredEvents),
      }
    }
    const checkpoint = await fetcher.getCheckpoint(jobId, options.checkpoint)
    const events = await fetcher.getEvents(jobId, checkpoint.runId)
    const filteredEvents = applyFilters(events, filterOptions)
    const job = await fetcher.getJob(jobId)
    return {
      job,
      checkpoint,
      events: filteredEvents,
      summary: createSummary(filteredEvents),
    }
  }
  if (options.run) {
    const jobId = options.job
    if (!jobId) {
      const latestJob = await fetcher.getLatestJob()
      if (!latestJob) {
        return null
      }
      const events = await fetcher.getEvents(latestJob.id, options.run)
      const filteredEvents = applyFilters(events, filterOptions)
      return {
        job: latestJob,
        events: filteredEvents,
        summary: createSummary(filteredEvents),
      }
    }
    const job = await fetcher.getJob(jobId)
    const events = await fetcher.getEvents(jobId, options.run)
    const filteredEvents = applyFilters(events, filterOptions)
    return {
      job,
      events: filteredEvents,
      summary: createSummary(filteredEvents),
    }
  }
  if (options.job) {
    const job = await fetcher.getJob(options.job)
    if (!job) {
      return null
    }
    const events = await fetcher.getAllEventsForJob(options.job)
    const filteredEvents = applyFilters(events, filterOptions)
    const checkpoints = await fetcher.getCheckpoints(options.job)
    return {
      job,
      checkpoints,
      events: filteredEvents,
      summary: createSummary(filteredEvents),
    }
  }
  const latestJob = await fetcher.getLatestJob()
  if (!latestJob) {
    return null
  }
  const events = await fetcher.getAllEventsForJob(latestJob.id)
  const filteredEvents = applyFilters(events, filterOptions)
  return {
    job: latestJob,
    events: filteredEvents,
    summary: createSummary(filteredEvents),
  }
}
