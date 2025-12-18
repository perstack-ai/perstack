import { describe, expect, it } from "vitest"
import { getProviderConfig } from "./provider-config.js"

describe("@perstack/runtime: getProviderConfig", () => {
  describe("anthropic provider", () => {
    it("returns anthropic config with api key from env", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const config = getProviderConfig("anthropic", env)
      expect(config).toEqual({
        providerName: "anthropic",
        apiKey: "test-key",
        baseUrl: undefined,
        headers: undefined,
      })
    })

    it("throws when ANTHROPIC_API_KEY is not set", () => {
      expect(() => getProviderConfig("anthropic", {})).toThrow("ANTHROPIC_API_KEY is not set")
    })

    it("uses baseUrl from setting when provided", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.api.com" } }
      const config = getProviderConfig("anthropic", env, providerTable)
      expect(config.baseUrl).toBe("https://custom.api.com")
    })

    it("falls back to ANTHROPIC_BASE_URL from env", () => {
      const env = {
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_BASE_URL: "https://env.api.com",
      }
      const config = getProviderConfig("anthropic", env)
      expect(config.baseUrl).toBe("https://env.api.com")
    })

    it("includes headers from setting", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const providerTable = { setting: { headers: { "X-Custom": "value" } } }
      const config = getProviderConfig("anthropic", env, providerTable)
      expect(config.headers).toEqual({ "X-Custom": "value" })
    })
  })

  describe("google provider", () => {
    it("returns google config with api key from env", () => {
      const env = { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }
      const config = getProviderConfig("google", env)
      expect(config).toEqual({
        providerName: "google",
        apiKey: "test-key",
        baseUrl: undefined,
        headers: undefined,
      })
    })

    it("throws when GOOGLE_GENERATIVE_AI_API_KEY is not set", () => {
      expect(() => getProviderConfig("google", {})).toThrow(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set",
      )
    })

    it("uses baseUrl from setting when provided", () => {
      const env = { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.api.com" } }
      const config = getProviderConfig("google", env, providerTable)
      expect(config.baseUrl).toBe("https://custom.api.com")
    })

    it("falls back to GOOGLE_GENERATIVE_AI_BASE_URL from env", () => {
      const env = {
        GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
        GOOGLE_GENERATIVE_AI_BASE_URL: "https://env.api.com",
      }
      const config = getProviderConfig("google", env)
      expect(config.baseUrl).toBe("https://env.api.com")
    })
  })

  describe("openai provider", () => {
    it("returns openai config with api key from env", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const config = getProviderConfig("openai", env)
      expect(config).toEqual({
        providerName: "openai",
        apiKey: "test-key",
        baseUrl: undefined,
        organization: undefined,
        project: undefined,
        name: undefined,
        headers: undefined,
      })
    })

    it("throws when OPENAI_API_KEY is not set", () => {
      expect(() => getProviderConfig("openai", {})).toThrow("OPENAI_API_KEY is not set")
    })

    it("uses baseUrl from setting when provided", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.api.com" } }
      const config = getProviderConfig("openai", env, providerTable)
      expect(config.baseUrl).toBe("https://custom.api.com")
    })

    it("falls back to OPENAI_BASE_URL from env", () => {
      const env = {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://env.api.com",
      }
      const config = getProviderConfig("openai", env)
      expect(config.baseUrl).toBe("https://env.api.com")
    })

    it("includes organization and project from setting", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const providerTable = { setting: { organization: "org-123", project: "proj-456" } }
      const config = getProviderConfig("openai", env, providerTable)
      expect(config.organization).toBe("org-123")
      expect(config.project).toBe("proj-456")
    })

    it("falls back to OPENAI_ORGANIZATION and OPENAI_PROJECT from env", () => {
      const env = {
        OPENAI_API_KEY: "test-key",
        OPENAI_ORGANIZATION: "env-org",
        OPENAI_PROJECT: "env-proj",
      }
      const config = getProviderConfig("openai", env)
      expect(config.organization).toBe("env-org")
      expect(config.project).toBe("env-proj")
    })

    it("includes name from setting", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const providerTable = { setting: { name: "custom-name" } }
      const config = getProviderConfig("openai", env, providerTable)
      expect(config.name).toBe("custom-name")
    })
  })

  describe("ollama provider", () => {
    it("returns ollama config without api key", () => {
      const config = getProviderConfig("ollama", {})
      expect(config).toEqual({
        providerName: "ollama",
        baseUrl: undefined,
        headers: undefined,
      })
    })

    it("uses baseUrl from setting when provided", () => {
      const providerTable = { setting: { baseUrl: "http://localhost:11434" } }
      const config = getProviderConfig("ollama", {}, providerTable)
      expect(config.baseUrl).toBe("http://localhost:11434")
    })

    it("falls back to OLLAMA_BASE_URL from env", () => {
      const env = { OLLAMA_BASE_URL: "http://custom:11434" }
      const config = getProviderConfig("ollama", env)
      expect(config.baseUrl).toBe("http://custom:11434")
    })
  })

  describe("azure-openai provider", () => {
    it("returns azure config with api key and resourceName", () => {
      const env = { AZURE_API_KEY: "test-key", AZURE_RESOURCE_NAME: "my-resource" }
      const config = getProviderConfig("azure-openai", env)
      expect(config).toEqual({
        providerName: "azure-openai",
        apiKey: "test-key",
        resourceName: "my-resource",
        apiVersion: undefined,
        baseUrl: undefined,
        headers: undefined,
        useDeploymentBasedUrls: undefined,
      })
    })

    it("throws when AZURE_API_KEY is not set", () => {
      expect(() => getProviderConfig("azure-openai", {})).toThrow("AZURE_API_KEY is not set")
    })

    it("throws when AZURE_RESOURCE_NAME and baseUrl are not set", () => {
      const env = { AZURE_API_KEY: "test-key" }
      expect(() => getProviderConfig("azure-openai", env)).toThrow(
        "AZURE_RESOURCE_NAME or baseUrl is not set",
      )
    })

    it("uses baseUrl from setting when resourceName not provided", () => {
      const env = { AZURE_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.azure.com" } }
      const config = getProviderConfig("azure-openai", env, providerTable)
      expect(config.baseUrl).toBe("https://custom.azure.com")
    })

    it("includes apiVersion from setting", () => {
      const env = { AZURE_API_KEY: "test-key", AZURE_RESOURCE_NAME: "my-resource" }
      const providerTable = { setting: { apiVersion: "2024-01-01" } }
      const config = getProviderConfig("azure-openai", env, providerTable)
      expect(config.apiVersion).toBe("2024-01-01")
    })

    it("falls back to AZURE_API_VERSION from env", () => {
      const env = {
        AZURE_API_KEY: "test-key",
        AZURE_RESOURCE_NAME: "my-resource",
        AZURE_API_VERSION: "2024-02-01",
      }
      const config = getProviderConfig("azure-openai", env)
      expect(config.apiVersion).toBe("2024-02-01")
    })

    it("includes useDeploymentBasedUrls from setting", () => {
      const env = { AZURE_API_KEY: "test-key", AZURE_RESOURCE_NAME: "my-resource" }
      const providerTable = { setting: { useDeploymentBasedUrls: true } }
      const config = getProviderConfig("azure-openai", env, providerTable)
      expect(config.useDeploymentBasedUrls).toBe(true)
    })
  })

  describe("amazon-bedrock provider", () => {
    it("returns bedrock config with credentials", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_REGION: "us-east-1",
      }
      const config = getProviderConfig("amazon-bedrock", env)
      expect(config).toEqual({
        providerName: "amazon-bedrock",
        accessKeyId: "access-key",
        secretAccessKey: "secret-key",
        region: "us-east-1",
        sessionToken: undefined,
      })
    })

    it("throws when AWS_ACCESS_KEY_ID is not set", () => {
      expect(() => getProviderConfig("amazon-bedrock", {})).toThrow("AWS_ACCESS_KEY_ID is not set")
    })

    it("throws when AWS_SECRET_ACCESS_KEY is not set", () => {
      const env = { AWS_ACCESS_KEY_ID: "access-key" }
      expect(() => getProviderConfig("amazon-bedrock", env)).toThrow(
        "AWS_SECRET_ACCESS_KEY is not set",
      )
    })

    it("throws when AWS_REGION is not set", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
      }
      expect(() => getProviderConfig("amazon-bedrock", env)).toThrow("AWS_REGION is not set")
    })

    it("uses region from setting when provided", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
      }
      const providerTable = { setting: { region: "eu-west-1" } }
      const config = getProviderConfig("amazon-bedrock", env, providerTable)
      expect(config.region).toBe("eu-west-1")
    })

    it("includes sessionToken from env", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_REGION: "us-east-1",
        AWS_SESSION_TOKEN: "session-token",
      }
      const config = getProviderConfig("amazon-bedrock", env)
      expect(config.sessionToken).toBe("session-token")
    })
  })

  describe("google-vertex provider", () => {
    it("returns vertex config with project and location", () => {
      const env = {
        GOOGLE_VERTEX_PROJECT: "my-project",
        GOOGLE_VERTEX_LOCATION: "us-central1",
      }
      const config = getProviderConfig("google-vertex", env)
      expect(config).toEqual({
        providerName: "google-vertex",
        project: "my-project",
        location: "us-central1",
        baseUrl: undefined,
        headers: undefined,
      })
    })

    it("uses project from setting when provided", () => {
      const providerTable = { setting: { project: "setting-project" } }
      const config = getProviderConfig("google-vertex", {}, providerTable)
      expect(config.project).toBe("setting-project")
    })

    it("uses location from setting when provided", () => {
      const providerTable = { setting: { location: "europe-west1" } }
      const config = getProviderConfig("google-vertex", {}, providerTable)
      expect(config.location).toBe("europe-west1")
    })

    it("uses baseUrl from setting when provided", () => {
      const providerTable = { setting: { baseUrl: "https://custom.vertex.com" } }
      const config = getProviderConfig("google-vertex", {}, providerTable)
      expect(config.baseUrl).toBe("https://custom.vertex.com")
    })

    it("falls back to GOOGLE_VERTEX_BASE_URL from env", () => {
      const env = { GOOGLE_VERTEX_BASE_URL: "https://env.vertex.com" }
      const config = getProviderConfig("google-vertex", env)
      expect(config.baseUrl).toBe("https://env.vertex.com")
    })
  })

  describe("deepseek provider", () => {
    it("returns deepseek config with api key from env", () => {
      const env = { DEEPSEEK_API_KEY: "test-key" }
      const config = getProviderConfig("deepseek", env)
      expect(config).toEqual({
        providerName: "deepseek",
        apiKey: "test-key",
        baseUrl: undefined,
        headers: undefined,
      })
    })

    it("throws when DEEPSEEK_API_KEY is not set", () => {
      expect(() => getProviderConfig("deepseek", {})).toThrow("DEEPSEEK_API_KEY is not set")
    })

    it("uses baseUrl from setting when provided", () => {
      const env = { DEEPSEEK_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.deepseek.com" } }
      const config = getProviderConfig("deepseek", env, providerTable)
      expect(config.baseUrl).toBe("https://custom.deepseek.com")
    })

    it("falls back to DEEPSEEK_BASE_URL from env", () => {
      const env = {
        DEEPSEEK_API_KEY: "test-key",
        DEEPSEEK_BASE_URL: "https://env.deepseek.com",
      }
      const config = getProviderConfig("deepseek", env)
      expect(config.baseUrl).toBe("https://env.deepseek.com")
    })
  })
})
