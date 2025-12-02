import { z } from "zod"
import { providerNameSchema } from "./provider-config.js"

/**
 * @schema RunCommandInputSchema
 * @since 0.0.1
 * @stability stable
 * @description CLI run command input parameters. Used by CLI to parse user input.
 */
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
  runId: z.string().optional(),
  envPath: z.array(z.string()).optional(),
  verbose: z.boolean().optional(),
  continue: z.boolean().optional(),
  continueRun: z.string().optional(),
  resumeFrom: z.string().optional(),
  interactiveToolCallResult: z.boolean().optional(),
})
export const runCommandInputSchema = z.object({
  expertKey: z.string(),
  query: z.string(),
  options: commandOptionsSchema,
})
export type RunCommandInput = z.infer<typeof runCommandInputSchema>
export const startCommandInputSchema = z.object({
  expertKey: z.string().optional(),
  query: z.string().optional(),
  options: commandOptionsSchema,
})
export type StartCommandInput = z.infer<typeof startCommandInputSchema>
