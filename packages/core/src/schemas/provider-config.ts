import { z } from "zod"

export const headersSchema = z.record(z.string(), z.string()).optional()

export const providerNameSchema = z.enum([
  "anthropic",
  "google",
  "openai",
  "ollama",
  "azure-openai",
  "amazon-bedrock",
  "google-vertex",
  "deepseek",
])
export type ProviderName = z.infer<typeof providerNameSchema>

export const anthropicProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.anthropic),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
export type AnthropicProviderConfig = z.infer<typeof anthropicProviderConfigSchema>

export const googleGenerativeAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.google),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
export type GoogleGenerativeAiProviderConfig = z.infer<
  typeof googleGenerativeAiProviderConfigSchema
>

export const openAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.openai),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  name: z.string().optional(),
  headers: headersSchema,
})
export type OpenAiProviderConfig = z.infer<typeof openAiProviderConfigSchema>

export const ollamaProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.ollama),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
export type OllamaProviderConfig = z.infer<typeof ollamaProviderConfigSchema>

export const azureOpenAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["azure-openai"]),
  apiKey: z.string(),
  resourceName: z.string().optional(),
  apiVersion: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
  useDeploymentBasedUrls: z.boolean().optional(),
})
export type AzureOpenAiProviderConfig = z.infer<typeof azureOpenAiProviderConfigSchema>

export const amazonBedrockProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["amazon-bedrock"]),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  region: z.string(),
  sessionToken: z.string().optional(),
})
export type AmazonBedrockProviderConfig = z.infer<typeof amazonBedrockProviderConfigSchema>

export const googleVertexProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["google-vertex"]),
  project: z.string().optional(),
  location: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
export type GoogleVertexProviderConfig = z.infer<typeof googleVertexProviderConfigSchema>
export const deepseekProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.deepseek),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
export type DeepseekProviderConfig = z.infer<typeof deepseekProviderConfigSchema>
export const providerConfigSchema = z.discriminatedUnion("providerName", [
  anthropicProviderConfigSchema,
  googleGenerativeAiProviderConfigSchema,
  openAiProviderConfigSchema,
  ollamaProviderConfigSchema,
  azureOpenAiProviderConfigSchema,
  amazonBedrockProviderConfigSchema,
  googleVertexProviderConfigSchema,
  deepseekProviderConfigSchema,
])
export type ProviderConfig = z.infer<typeof providerConfigSchema>
