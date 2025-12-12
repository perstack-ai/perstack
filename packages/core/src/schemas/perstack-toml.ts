import { z } from "zod"
import { headersSchema } from "./provider-config.js"
import type { RuntimeName } from "./runtime-name.js"
import { runtimeNameSchema } from "./runtime-name.js"

const domainPatternRegex =
  /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
const domainPatternSchema = z.string().regex(domainPatternRegex, {
  message:
    "Invalid domain pattern. Use exact domain (example.com) or wildcard prefix (*.example.com)",
})

export interface NetworkConfig {
  allowedDomains?: string[]
}

export const networkConfigSchema = z.object({
  allowedDomains: z.array(domainPatternSchema).optional(),
})

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

const deepseekSettingSchema = z.object({
  baseUrl: z.string().optional(),
  headers: headersSchema,
})

/** Provider configuration in perstack.toml */
export type ProviderTable =
  | { providerName: "anthropic"; setting?: z.infer<typeof anthropicSettingSchema> }
  | { providerName: "google"; setting?: z.infer<typeof googleSettingSchema> }
  | { providerName: "openai"; setting?: z.infer<typeof openAiSettingSchema> }
  | { providerName: "ollama"; setting?: z.infer<typeof ollamaSettingSchema> }
  | { providerName: "azure-openai"; setting?: z.infer<typeof azureOpenAiSettingSchema> }
  | { providerName: "amazon-bedrock"; setting?: z.infer<typeof amazonBedrockSettingSchema> }
  | { providerName: "google-vertex"; setting?: z.infer<typeof googleVertexSettingSchema> }
  | { providerName: "deepseek"; setting?: z.infer<typeof deepseekSettingSchema> }

export const providerTableSchema = z.discriminatedUnion("providerName", [
  z.object({
    providerName: z.literal("anthropic"),
    setting: anthropicSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("google"),
    setting: googleSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("openai"),
    setting: openAiSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("ollama"),
    setting: ollamaSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("azure-openai"),
    setting: azureOpenAiSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("amazon-bedrock"),
    setting: amazonBedrockSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("google-vertex"),
    setting: googleVertexSettingSchema.optional(),
  }),
  z.object({
    providerName: z.literal("deepseek"),
    setting: deepseekSettingSchema.optional(),
  }),
])

/** Skill configuration in perstack.toml */
export type PerstackConfigSkill =
  | {
      type: "mcpStdioSkill"
      description?: string
      rule?: string
      pick?: string[]
      omit?: string[]
      command: string
      packageName?: string
      args?: string[]
      requiredEnv?: string[]
    }
  | {
      type: "mcpSseSkill"
      description?: string
      rule?: string
      pick?: string[]
      omit?: string[]
      endpoint: string
    }
  | {
      type: "interactiveSkill"
      description?: string
      rule?: string
      tools: Record<string, { description?: string; inputJsonSchema: string }>
    }

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
  skills?: Record<string, PerstackConfigSkill>
  /** Delegates list */
  delegates?: string[]
  /** Tags for categorization */
  tags?: string[]
  /** Network configuration (merged with global) */
  network?: NetworkConfig
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
  /** Default execution runtime */
  runtime?: RuntimeName
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
  /** Global network configuration for docker runtime */
  network?: NetworkConfig
}

export const perstackConfigSchema = z.object({
  provider: providerTableSchema.optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  runtime: runtimeNameSchema.optional(),
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
        tags: z.array(z.string()).optional(),
        network: networkConfigSchema.optional(),
      }),
    )
    .optional(),
  perstackApiBaseUrl: z.url().optional(),
  perstackBaseSkillCommand: z.array(z.string()).optional(),
  envPath: z.array(z.string()).optional(),
  network: networkConfigSchema.optional(),
})
