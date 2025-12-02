import { z } from "zod"
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

export const providerTableSchema = z.object({
  providerName: providerNameSchema,
  setting: providerSettingSchema.optional(),
})
export type ProviderTable = z.infer<typeof providerTableSchema>

/**
 * perstack.toml config schema
 */
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
export type PerstackConfig = z.infer<typeof perstackConfigSchema>
