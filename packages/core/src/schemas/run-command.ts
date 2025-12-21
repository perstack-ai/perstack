import { z } from "zod"
import type { ReasoningBudget } from "./perstack-toml.js"
import { reasoningBudgetSchema } from "./perstack-toml.js"
import type { ProviderName } from "./provider-config.js"
import { providerNameSchema } from "./provider-config.js"
import type { RuntimeName } from "./runtime-name.js"
import { runtimeNameSchema } from "./runtime-name.js"

/** Parsed command options after transformation */
export interface CommandOptions {
  /** Path to perstack.toml config file */
  config?: string
  /** LLM provider to use */
  provider?: ProviderName
  /** Model name */
  model?: string
  /** Temperature (0-1) */
  temperature?: number
  /** Reasoning budget for native LLM reasoning (extended thinking) */
  reasoningBudget?: ReasoningBudget
  /** Maximum steps */
  maxSteps?: number
  /** Maximum retries */
  maxRetries?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** Custom job ID */
  jobId?: string
  /** Custom run ID */
  runId?: string
  /** Paths to .env files */
  envPath?: string[]
  /** Environment variable names to pass to Docker runtime */
  env?: string[]
  /** Enable verbose logging */
  verbose?: boolean
  /** Continue most recent job */
  continue?: boolean
  /** Continue specific job by ID */
  continueJob?: string
  /** Resume from specific checkpoint (requires --continue or --continue-job) */
  resumeFrom?: string
  /** Query is interactive tool call result */
  interactiveToolCallResult?: boolean
  /** Execution runtime */
  runtime?: RuntimeName
  /** Workspace directory for Docker runtime */
  workspace?: string
}

const commandOptionsSchema = z.object({
  config: z.string().optional(),
  provider: providerNameSchema.optional(),
  model: z.string().optional(),
  temperature: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      const parsedValue = Number.parseFloat(value)
      if (Number.isNaN(parsedValue)) return undefined
      return parsedValue
    }),
  reasoningBudget: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      // Check if it's a named level
      if (["minimal", "low", "medium", "high"].includes(value)) {
        return value as ReasoningBudget
      }
      // Try to parse as number
      const parsedValue = Number.parseInt(value, 10)
      if (Number.isNaN(parsedValue)) return undefined
      return parsedValue
    })
    .pipe(reasoningBudgetSchema.optional()),
  maxSteps: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      const parsedValue = Number.parseInt(value, 10)
      if (Number.isNaN(parsedValue)) return undefined
      return parsedValue
    }),
  maxRetries: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      const parsedValue = Number.parseInt(value, 10)
      if (Number.isNaN(parsedValue)) return undefined
      return parsedValue
    }),
  timeout: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      const parsedValue = Number.parseInt(value, 10)
      if (Number.isNaN(parsedValue)) return undefined
      return parsedValue
    }),
  jobId: z.string().optional(),
  runId: z.string().optional(),
  envPath: z
    .array(z.string())
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  env: z
    .array(z.string())
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  verbose: z.boolean().optional(),
  continue: z.boolean().optional(),
  continueJob: z.string().optional(),
  resumeFrom: z.string().optional(),
  interactiveToolCallResult: z.boolean().optional(),
  runtime: runtimeNameSchema.optional(),
  workspace: z.string().optional(),
})

/** Input for the `perstack run` command */
export interface RunCommandInput {
  /** Expert key to run */
  expertKey: string
  /** Query or prompt */
  query: string
  /** Command options */
  options: CommandOptions
}

export const runCommandInputSchema = z.object({
  expertKey: z.string(),
  query: z.string(),
  options: commandOptionsSchema,
})

/** Input for the `perstack start` command */
export interface StartCommandInput {
  /** Expert key to run (optional, prompts if not provided) */
  expertKey?: string
  /** Query or prompt (optional, prompts if not provided) */
  query?: string
  /** Command options */
  options: CommandOptions
}

export const startCommandInputSchema = z.object({
  expertKey: z.string().optional(),
  query: z.string().optional(),
  options: commandOptionsSchema,
})
