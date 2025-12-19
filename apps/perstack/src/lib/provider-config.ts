import type { ProviderConfig, ProviderName, ProviderTable } from "@perstack/core"

type SettingRecord = Record<string, unknown>

export function getProviderConfig(
  provider: ProviderName,
  env: Record<string, string>,
  providerTable?: ProviderTable,
): ProviderConfig {
  const setting = (providerTable?.setting ?? {}) as SettingRecord
  switch (provider) {
    case "anthropic": {
      const apiKey = env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")
      return {
        providerName: "anthropic",
        apiKey,
        baseUrl: (setting.baseUrl as string | undefined) ?? env.ANTHROPIC_BASE_URL,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
    case "google": {
      const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set")
      return {
        providerName: "google",
        apiKey,
        baseUrl: (setting.baseUrl as string | undefined) ?? env.GOOGLE_GENERATIVE_AI_BASE_URL,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
    case "openai": {
      const apiKey = env.OPENAI_API_KEY
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set")
      return {
        providerName: "openai",
        apiKey,
        baseUrl: (setting.baseUrl as string | undefined) ?? env.OPENAI_BASE_URL,
        organization: (setting.organization as string | undefined) ?? env.OPENAI_ORGANIZATION,
        project: (setting.project as string | undefined) ?? env.OPENAI_PROJECT,
        name: setting.name as string | undefined,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
    case "ollama": {
      return {
        providerName: "ollama",
        baseUrl: (setting.baseUrl as string | undefined) ?? env.OLLAMA_BASE_URL,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
    case "azure-openai": {
      const apiKey = env.AZURE_API_KEY
      if (!apiKey) throw new Error("AZURE_API_KEY is not set")
      const resourceName = (setting.resourceName as string | undefined) ?? env.AZURE_RESOURCE_NAME
      const baseUrl = (setting.baseUrl as string | undefined) ?? env.AZURE_BASE_URL
      if (!resourceName && !baseUrl) throw new Error("AZURE_RESOURCE_NAME or baseUrl is not set")
      return {
        providerName: "azure-openai",
        apiKey,
        resourceName,
        apiVersion: (setting.apiVersion as string | undefined) ?? env.AZURE_API_VERSION,
        baseUrl,
        headers: setting.headers as Record<string, string> | undefined,
        useDeploymentBasedUrls: setting.useDeploymentBasedUrls as boolean | undefined,
      }
    }
    case "amazon-bedrock": {
      const accessKeyId = env.AWS_ACCESS_KEY_ID
      const secretAccessKey = env.AWS_SECRET_ACCESS_KEY
      const sessionToken = env.AWS_SESSION_TOKEN
      if (!accessKeyId) throw new Error("AWS_ACCESS_KEY_ID is not set")
      if (!secretAccessKey) throw new Error("AWS_SECRET_ACCESS_KEY is not set")
      const region = (setting.region as string | undefined) ?? env.AWS_REGION
      if (!region) throw new Error("AWS_REGION is not set")
      return {
        providerName: "amazon-bedrock",
        accessKeyId,
        secretAccessKey,
        region,
        sessionToken,
      }
    }
    case "google-vertex": {
      return {
        providerName: "google-vertex",
        project: (setting.project as string | undefined) ?? env.GOOGLE_VERTEX_PROJECT,
        location: (setting.location as string | undefined) ?? env.GOOGLE_VERTEX_LOCATION,
        baseUrl: (setting.baseUrl as string | undefined) ?? env.GOOGLE_VERTEX_BASE_URL,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
    case "deepseek": {
      const apiKey = env.DEEPSEEK_API_KEY
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set")
      return {
        providerName: "deepseek",
        apiKey,
        baseUrl: (setting.baseUrl as string | undefined) ?? env.DEEPSEEK_BASE_URL,
        headers: setting.headers as Record<string, string> | undefined,
      }
    }
  }
}
