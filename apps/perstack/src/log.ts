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

const DEFAULT_TAKE = 100
const DEFAULT_OFFSET = 0

function parsePositiveInt(val: string, optionName: string): number {
  const parsed = parseInt(val, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid value for ${optionName}: "${val}" is not a valid number`)
  }
  if (parsed < 0) {
    throw new Error(`Invalid value for ${optionName}: "${val}" must be non-negative`)
  }
  return parsed
}

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
  .option(
    "--take <n>",
    `Number of events to display (default: ${DEFAULT_TAKE}, use 0 for all)`,
    (val) => parsePositiveInt(val, "--take"),
  )
  .option("--offset <n>", `Number of events to skip (default: ${DEFAULT_OFFSET})`, (val) =>
    parsePositiveInt(val, "--offset"),
  )
  .option("--context <n>", "Include N events before/after matches", (val) =>
    parsePositiveInt(val, "--context"),
  )
  .option("--messages", "Show message history for checkpoint")
  .option("--summary", "Show summarized view")
  .action(async (options: LogCommandOptions) => {
    try {
      const storagePath = process.env.PERSTACK_STORAGE_PATH ?? `${process.cwd()}/perstack`
      const storage = new FileSystemStorage({ basePath: storagePath })
      const adapter = createStorageAdapter(storage, storagePath)
      const fetcher = createLogDataFetcher(adapter)
      const filterOptions = buildFilterOptions(options)
      const formatterOptions = buildFormatterOptions(options)
      const output = await buildOutput(fetcher, options, filterOptions, storagePath)
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
  // --take 0 means no limit (show all)
  const take = options.take ?? DEFAULT_TAKE
  if (take > 0) {
    filterOptions.take = take
  }
  filterOptions.offset = options.offset ?? DEFAULT_OFFSET
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
  storagePath: string,
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
      const result = applyFilters(events, filterOptions)
      return {
        job: latestJob,
        checkpoint,
        events: result.events,
        summary: createSummary(result.events),
        isLatestJob: true,
        storagePath,
        totalEventsBeforeLimit: result.totalBeforePagination,
        matchedAfterPagination: result.matchedAfterPagination,
      }
    }
    const job = await fetcher.getJob(jobId)
    if (!job) {
      return null
    }
    const checkpoint = await fetcher.getCheckpoint(jobId, options.checkpoint)
    const events = await fetcher.getEvents(jobId, checkpoint.runId)
    const result = applyFilters(events, filterOptions)
    return {
      job,
      checkpoint,
      events: result.events,
      summary: createSummary(result.events),
      storagePath,
      totalEventsBeforeLimit: result.totalBeforePagination,
      matchedAfterPagination: result.matchedAfterPagination,
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
      const result = applyFilters(events, filterOptions)
      return {
        job: latestJob,
        events: result.events,
        summary: createSummary(result.events),
        isLatestJob: true,
        storagePath,
        totalEventsBeforeLimit: result.totalBeforePagination,
        matchedAfterPagination: result.matchedAfterPagination,
      }
    }
    const job = await fetcher.getJob(jobId)
    if (!job) {
      return null
    }
    const events = await fetcher.getEvents(jobId, options.run)
    const result = applyFilters(events, filterOptions)
    return {
      job,
      events: result.events,
      summary: createSummary(result.events),
      storagePath,
      totalEventsBeforeLimit: result.totalBeforePagination,
      matchedAfterPagination: result.matchedAfterPagination,
    }
  }
  if (options.job) {
    const job = await fetcher.getJob(options.job)
    if (!job) {
      return null
    }
    const events = await fetcher.getAllEventsForJob(options.job)
    const result = applyFilters(events, filterOptions)
    const checkpoints = await fetcher.getCheckpoints(options.job)
    return {
      job,
      checkpoints,
      events: result.events,
      summary: createSummary(result.events),
      storagePath,
      totalEventsBeforeLimit: result.totalBeforePagination,
      matchedAfterPagination: result.matchedAfterPagination,
    }
  }
  const latestJob = await fetcher.getLatestJob()
  if (!latestJob) {
    return null
  }
  const events = await fetcher.getAllEventsForJob(latestJob.id)
  const result = applyFilters(events, filterOptions)
  return {
    job: latestJob,
    events: result.events,
    summary: createSummary(result.events),
    isLatestJob: true,
    storagePath,
    totalEventsBeforeLimit: result.totalBeforePagination,
    matchedAfterPagination: result.matchedAfterPagination,
  }
}
