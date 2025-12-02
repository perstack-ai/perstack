import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createAzure } from "@ai-sdk/azure"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createVertex } from "@ai-sdk/google-vertex"
import { createOpenAI } from "@ai-sdk/openai"
import { knownModels, type ProviderConfig, type ProviderName, type Usage } from "@perstack/core"
import type { LanguageModel } from "ai"
import { createOllama } from "ollama-ai-provider-v2"

export function getModel(modelId: string, providerConfig: ProviderConfig): LanguageModel {
  switch (providerConfig.providerName) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
      })
      return anthropic(modelId)
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
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
      })
      return openai(modelId)
    }
    case "ollama": {
      const ollama = createOllama({
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
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
      })
      return azure(modelId)
    }
    case "amazon-bedrock": {
      const amazonBedrock = createAmazonBedrock({
        accessKeyId: providerConfig.accessKeyId,
        secretAccessKey: providerConfig.secretAccessKey,
        region: providerConfig.region,
        sessionToken: providerConfig.sessionToken,
      })
      return amazonBedrock(modelId)
    }
    case "google-vertex": {
      const vertex = createVertex({
        project: providerConfig.project,
        location: providerConfig.location,
        baseURL: providerConfig.baseUrl,
        headers: providerConfig.headers,
      })
      return vertex(modelId)
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
