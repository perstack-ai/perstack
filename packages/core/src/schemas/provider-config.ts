import { z } from "zod"

/** HTTP headers for API requests */
export type Headers = Record<string, string> | undefined

export const headersSchema = z.record(z.string(), z.string()).optional()

/** Supported LLM provider names */
export type ProviderName =
  | "anthropic"
  | "google"
  | "openai"
  | "ollama"
  | "azure-openai"
  | "amazon-bedrock"
  | "google-vertex"
  | "deepseek"

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

/** Anthropic provider configuration */
export interface AnthropicProviderConfig {
  providerName: "anthropic"
  /** API key for Anthropic */
  apiKey: string
  /** Custom base URL */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
}

export const anthropicProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.anthropic),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
anthropicProviderConfigSchema satisfies z.ZodType<AnthropicProviderConfig>

/** Google Generative AI provider configuration */
export interface GoogleGenerativeAiProviderConfig {
  providerName: "google"
  /** API key for Google */
  apiKey: string
  /** Custom base URL */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
}

export const googleGenerativeAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.google),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
googleGenerativeAiProviderConfigSchema satisfies z.ZodType<GoogleGenerativeAiProviderConfig>

/** OpenAI provider configuration */
export interface OpenAiProviderConfig {
  providerName: "openai"
  /** API key for OpenAI */
  apiKey: string
  /** Custom base URL */
  baseUrl?: string
  /** Organization ID */
  organization?: string
  /** Project ID */
  project?: string
  /** Custom name for the provider instance */
  name?: string
  /** Custom headers */
  headers?: Headers
}

export const openAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.openai),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  name: z.string().optional(),
  headers: headersSchema,
})
openAiProviderConfigSchema satisfies z.ZodType<OpenAiProviderConfig>

/** Ollama provider configuration */
export interface OllamaProviderConfig {
  providerName: "ollama"
  /** Custom base URL (defaults to localhost) */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
}

export const ollamaProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.ollama),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
ollamaProviderConfigSchema satisfies z.ZodType<OllamaProviderConfig>

/** Azure OpenAI provider configuration */
export interface AzureOpenAiProviderConfig {
  providerName: "azure-openai"
  /** API key for Azure */
  apiKey: string
  /** Azure resource name */
  resourceName?: string
  /** API version */
  apiVersion?: string
  /** Custom base URL */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
  /** Use deployment-based URLs */
  useDeploymentBasedUrls?: boolean
}

export const azureOpenAiProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["azure-openai"]),
  apiKey: z.string(),
  resourceName: z.string().optional(),
  apiVersion: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
  useDeploymentBasedUrls: z.boolean().optional(),
})
azureOpenAiProviderConfigSchema satisfies z.ZodType<AzureOpenAiProviderConfig>

/** Amazon Bedrock provider configuration */
export interface AmazonBedrockProviderConfig {
  providerName: "amazon-bedrock"
  /** AWS access key ID */
  accessKeyId: string
  /** AWS secret access key */
  secretAccessKey: string
  /** AWS region */
  region: string
  /** AWS session token (for temporary credentials) */
  sessionToken?: string
}

export const amazonBedrockProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["amazon-bedrock"]),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  region: z.string(),
  sessionToken: z.string().optional(),
})
amazonBedrockProviderConfigSchema satisfies z.ZodType<AmazonBedrockProviderConfig>

/** Google Vertex AI provider configuration */
export interface GoogleVertexProviderConfig {
  providerName: "google-vertex"
  /** GCP project ID */
  project?: string
  /** GCP location */
  location?: string
  /** Custom base URL */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
}

export const googleVertexProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum["google-vertex"]),
  project: z.string().optional(),
  location: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
googleVertexProviderConfigSchema satisfies z.ZodType<GoogleVertexProviderConfig>

/** DeepSeek provider configuration */
export interface DeepseekProviderConfig {
  providerName: "deepseek"
  /** API key for DeepSeek */
  apiKey: string
  /** Custom base URL */
  baseUrl?: string
  /** Custom headers */
  headers?: Headers
}

export const deepseekProviderConfigSchema = z.object({
  providerName: z.literal(providerNameSchema.enum.deepseek),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  headers: headersSchema,
})
deepseekProviderConfigSchema satisfies z.ZodType<DeepseekProviderConfig>

/** Union of all provider configurations */
export type ProviderConfig =
  | AnthropicProviderConfig
  | GoogleGenerativeAiProviderConfig
  | OpenAiProviderConfig
  | OllamaProviderConfig
  | AzureOpenAiProviderConfig
  | AmazonBedrockProviderConfig
  | GoogleVertexProviderConfig
  | DeepseekProviderConfig

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
