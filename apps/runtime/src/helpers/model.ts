import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createAzure } from "@ai-sdk/azure"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createVertex } from "@ai-sdk/google-vertex"
import { createOpenAI } from "@ai-sdk/openai"
import {
  knownModels,
  type ProviderConfig,
  type ProviderName,
  type ReasoningBudget,
  type Usage,
} from "@perstack/core"
import type { ProviderOptions } from "@perstack/provider-core"
import type { LanguageModel } from "ai"
import { createOllama } from "ollama-ai-provider-v2"
import { ProxyAgent, fetch as undiciFetch } from "undici"

function createProxyFetch(proxyUrl: string): typeof globalThis.fetch {
  const agent = new ProxyAgent(proxyUrl)
  return (input, init) => {
    return undiciFetch(input, { ...init, dispatcher: agent }) as Promise<Response>
  }
}

export interface GetModelOptions {
  proxyUrl?: string
}

export function getModel(
  modelId: string,
  providerConfig: ProviderConfig,
  options?: GetModelOptions,
): LanguageModel {
  const customFetch = options?.proxyUrl ? createProxyFetch(options.proxyUrl) : undefined
  switch (providerConfig.providerName) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return anthropic(modelId)
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return google(modelId)
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        organization: providerConfig.organization,
        project: providerConfig.project,
        name: providerConfig.name,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return openai(modelId)
    }
    case "ollama": {
      const ollama = createOllama({
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return ollama(modelId)
    }
    case "azure-openai": {
      const azure = createAzure({
        apiKey: providerConfig.apiKey,
        resourceName: providerConfig.resourceName,
        apiVersion: providerConfig.apiVersion,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        useDeploymentBasedUrls: providerConfig.useDeploymentBasedUrls,
        fetch: customFetch,
      })
      return azure(modelId)
    }
    case "amazon-bedrock": {
      const amazonBedrock = createAmazonBedrock({
        accessKeyId: providerConfig.accessKeyId,
        secretAccessKey: providerConfig.secretAccessKey,
        region: providerConfig.region,
        sessionToken: providerConfig.sessionToken,
        fetch: customFetch,
      })
      return amazonBedrock(modelId)
    }
    case "google-vertex": {
      const vertex = createVertex({
        project: providerConfig.project,
        location: providerConfig.location,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return vertex(modelId)
    }
    case "deepseek": {
      const deepseek = createDeepSeek({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
        fetch: customFetch,
      })
      return deepseek(modelId)
    }
    default: {
      const _exhaustive: never = providerConfig
      throw new Error(`Unknown provider: ${(_exhaustive as ProviderConfig).providerName}`)
    }
  }
}

export function getContextWindow(providerName: ProviderName, modelId: string): number | undefined {
  const modelConfig = knownModels
    .find((model) => model.provider === providerName)
    ?.models.find((model) => model.name === modelId)
  return modelConfig?.contextWindow
}

export function calculateContextWindowUsage(usage: Usage, contextWindow: number): number {
  return (usage.inputTokens + usage.cachedInputTokens + usage.outputTokens) / contextWindow
}

/**
 * Get provider-specific options for native LLM reasoning (extended thinking).
 * Returns undefined if reasoning budget is not set.
 */
export function getReasoningProviderOptions(
  providerName: ProviderName,
  reasoningBudget: ReasoningBudget | undefined,
): ProviderOptions | undefined {
  if (!reasoningBudget) return undefined

  switch (providerName) {
    case "anthropic": {
      const budgetTokens = budgetToTokens(reasoningBudget)
      return {
        anthropic: {
          thinking: { type: "enabled", budgetTokens },
        },
      }
    }
    case "openai": {
      const effort = budgetToEffort(reasoningBudget)
      return {
        openai: { reasoningEffort: effort },
      }
    }
    case "google": {
      // Google uses thinkingBudget (token count) instead of thinkingLevel for gemini-2.5-flash
      const budgetTokens = budgetToTokens(reasoningBudget)
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: budgetTokens,
            includeThoughts: true,
          },
        },
      }
    }
    default:
      // Other providers don't support native reasoning yet
      return undefined
  }
}

function budgetToTokens(budget: ReasoningBudget): number {
  if (typeof budget === "number") return budget
  const map: Record<string, number> = {
    minimal: 1024,
    low: 2048,
    medium: 5000,
    high: 10000,
  }
  return map[budget] ?? 5000
}

function budgetToEffort(budget: ReasoningBudget): string {
  if (typeof budget === "number") {
    // o3-mini only supports 'low', 'medium', 'high' (not 'minimal')
    if (budget <= 2048) return "low"
    if (budget <= 5000) return "medium"
    return "high"
  }
  // Map 'minimal' to 'low' for o3-mini compatibility
  if (budget === "minimal") return "low"
  return budget
}
