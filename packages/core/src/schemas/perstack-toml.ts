import { z } from "zod"
import type { ProviderName } from "./provider-config.js"
import { headersSchema, providerNameSchema } from "./provider-config.js"

const anthropicSettingSchema = z.object({
  baseUrl: z.string().optional(),
  headers: headersSchema,
})

const googleSettingSchema = z.object({
  baseUrl: z.string().optional(),
  headers: headersSchema,
})

const openAiSettingSchema = z.object({
  baseUrl: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  name: z.string().optional(),
  headers: headersSchema,
})

const ollamaSettingSchema = z.object({
  baseUrl: z.string().optional(),
  headers: headersSchema,
})

const azureOpenAiSettingSchema = z.object({
  resourceName: z.string().optional(),
  apiVersion: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
  useDeploymentBasedUrls: z.boolean().optional(),
})

const amazonBedrockSettingSchema = z.object({
  region: z.string().optional(),
})

const googleVertexSettingSchema = z.object({
  project: z.string().optional(),
  location: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})

const providerSettingSchema = z.union([
  anthropicSettingSchema,
  googleSettingSchema,
  openAiSettingSchema,
  ollamaSettingSchema,
  azureOpenAiSettingSchema,
  amazonBedrockSettingSchema,
  googleVertexSettingSchema,
])

/** Provider configuration in perstack.toml */
export interface ProviderTable {
  /** Provider name */
  providerName: ProviderName
  /** Provider-specific settings */
  setting?: Record<string, unknown>
}

export const providerTableSchema = z.object({
  providerName: providerNameSchema,
  setting: providerSettingSchema.optional(),
})

/** Expert definition in perstack.toml (simplified from full Expert) */
export interface PerstackConfigExpert {
  /** Semantic version */
  version?: string
  /** Minimum runtime version required */
  minRuntimeVersion?: string
  /** Description of the Expert */
  description?: string
  /** System instruction */
  instruction: string
  /** Skills configuration */
  skills?: Record<string, unknown>
  /** Delegates list */
  delegates?: string[]
}

/**
 * Configuration loaded from perstack.toml.
 * This is the primary configuration file for Perstack projects.
 */
export interface PerstackConfig {
  /** Default provider configuration */
  provider?: ProviderTable
  /** Default model name */
  model?: string
  /** Default temperature (0-1) */
  temperature?: number
  /** Maximum steps per run */
  maxSteps?: number
  /** Maximum retries on generation failure */
  maxRetries?: number
  /** Timeout per generation in milliseconds */
  timeout?: number
  /** Expert definitions */
  experts?: Record<string, PerstackConfigExpert>
  /** Custom Perstack API base URL */
  perstackApiBaseUrl?: string
  /** Custom command for @perstack/base skill */
  perstackBaseSkillCommand?: string[]
  /** Paths to .env files */
  envPath?: string[]
}

export const perstackConfigSchema = z.object({
  provider: providerTableSchema.optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxSteps: z.number().optional(),
  maxRetries: z.number().optional(),
  timeout: z.number().optional(),
  experts: z
    .record(
      z.string(),
      z.object({
        version: z.string().optional(),
        minRuntimeVersion: z.string().optional(),
        description: z.string().optional(),
        instruction: z.string(),
        skills: z
          .record(
            z.string(),
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("mcpStdioSkill"),
                description: z.string().optional(),
                rule: z.string().optional(),
                pick: z.array(z.string()).optional(),
                omit: z.array(z.string()).optional(),
                command: z.string(),
                packageName: z.string().optional(),
                args: z.array(z.string()).optional(),
                requiredEnv: z.array(z.string()).optional(),
              }),
              z.object({
                type: z.literal("mcpSseSkill"),
                description: z.string().optional(),
                rule: z.string().optional(),
                pick: z.array(z.string()).optional(),
                omit: z.array(z.string()).optional(),
                endpoint: z.string(),
              }),
              z.object({
                type: z.literal("interactiveSkill"),
                description: z.string().optional(),
                rule: z.string().optional(),
                tools: z.record(
                  z.string(),
                  z.object({
                    description: z.string().optional(),
                    inputJsonSchema: z.string(),
                  }),
                ),
              }),
            ]),
          )
          .optional(),
        delegates: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  perstackApiBaseUrl: z.url().optional(),
  perstackBaseSkillCommand: z.array(z.string()).optional(),
  envPath: z.array(z.string()).optional(),
})
