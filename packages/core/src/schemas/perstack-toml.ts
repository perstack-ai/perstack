import { z } from "zod"
import { headersSchema } from "./provider-config.js"
import type { RuntimeName } from "./runtime-name.js"
import { runtimeNameSchema } from "./runtime-name.js"

const domainPatternRegex =
  /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
export const domainPatternSchema = z.string().regex(domainPatternRegex, {
  message:
    "Invalid domain pattern. Use exact domain (example.com) or wildcard prefix (*.example.com)",
})

function isPrivateOrLocalIP(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return true
  }
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const a = Number(ipv4Match[1])
    const b = Number(ipv4Match[2])
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 127) return true
  }
  if (hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) {
    return true
  }
  return false
}

const sseEndpointSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:") return false
        if (isPrivateOrLocalIP(parsed.hostname)) return false
        return true
      } catch {
        return false
      }
    },
    { message: "SSE endpoint must be a public HTTPS URL" },
  )

const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"), { message: "URL must use HTTPS" })

const anthropicSettingSchema = z.object({
  baseUrl: httpsUrlSchema.optional(),
  headers: headersSchema,
})

const googleSettingSchema = z.object({
  baseUrl: httpsUrlSchema.optional(),
  headers: headersSchema,
})

const openAiSettingSchema = z.object({
  baseUrl: httpsUrlSchema.optional(),
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
  baseUrl: httpsUrlSchema.optional(),
  headers: headersSchema,
  useDeploymentBasedUrls: z.boolean().optional(),
})

const amazonBedrockSettingSchema = z.object({
  region: z.string().optional(),
})

const googleVertexSettingSchema = z.object({
  project: z.string().optional(),
  location: z.string().optional(),
  baseUrl: httpsUrlSchema.optional(),
  headers: headersSchema,
})

const deepseekSettingSchema = z.object({
  baseUrl: httpsUrlSchema.optional(),
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
      allowedDomains?: string[]
    }
  | {
      type: "mcpSseSkill"
      description?: string
      rule?: string
      pick?: string[]
      omit?: string[]
      endpoint: string
      allowedDomains?: string[]
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
                allowedDomains: z.array(domainPatternSchema).optional(),
              }),
              z.object({
                type: z.literal("mcpSseSkill"),
                description: z.string().optional(),
                rule: z.string().optional(),
                pick: z.array(z.string()).optional(),
                omit: z.array(z.string()).optional(),
                endpoint: sseEndpointSchema,
                allowedDomains: z.array(domainPatternSchema).optional(),
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
      }),
    )
    .optional(),
  perstackApiBaseUrl: z
    .url()
    .refine((url) => url.startsWith("https://"), { message: "perstackApiBaseUrl must use HTTPS" })
    .optional(),
  perstackBaseSkillCommand: z.array(z.string()).optional(),
  envPath: z.array(z.string()).optional(),
})
