import type { ProviderTable } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { getProviderConfig } from "./provider-config.js"

type ConfigWithApiKey = { apiKey: string }
type ConfigWithBaseUrl = { baseUrl?: string }

describe("@perstack/runtime: getProviderConfig", () => {
  describe("anthropic", () => {
    it("returns anthropic config with API key", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const config = getProviderConfig("anthropic", env)

      expect(config.providerName).toBe("anthropic")
      expect((config as ConfigWithApiKey).apiKey).toBe("test-key")
    })

    it("throws when ANTHROPIC_API_KEY is not set", () => {
      expect(() => getProviderConfig("anthropic", {})).toThrow("ANTHROPIC_API_KEY is not set")
    })

    it("uses baseUrl from setting if provided", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const providerTable = { setting: { baseUrl: "https://custom.api.com" } } as ProviderTable
      const config = getProviderConfig("anthropic", env, providerTable)

      expect((config as ConfigWithBaseUrl).baseUrl).toBe("https://custom.api.com")
    })

    it("uses baseUrl from env if setting not provided", () => {
      const env = { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "https://env.api.com" }
      const config = getProviderConfig("anthropic", env)

      expect((config as ConfigWithBaseUrl).baseUrl).toBe("https://env.api.com")
    })

    it("includes headers from setting", () => {
      const env = { ANTHROPIC_API_KEY: "test-key" }
      const providerTable = {
        setting: { headers: { "X-Custom": "value" } },
      } as unknown as ProviderTable
      const config = getProviderConfig("anthropic", env, providerTable)

      expect((config as { headers?: Record<string, string> }).headers).toEqual({
        "X-Custom": "value",
      })
    })
  })

  describe("google", () => {
    it("returns google config with API key", () => {
      const env = { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }
      const config = getProviderConfig("google", env)

      expect(config.providerName).toBe("google")
      expect((config as ConfigWithApiKey).apiKey).toBe("test-key")
    })

    it("throws when GOOGLE_GENERATIVE_AI_API_KEY is not set", () => {
      expect(() => getProviderConfig("google", {})).toThrow(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set",
      )
    })
  })

  describe("openai", () => {
    it("returns openai config with API key", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const config = getProviderConfig("openai", env)

      expect(config.providerName).toBe("openai")
      expect((config as ConfigWithApiKey).apiKey).toBe("test-key")
    })

    it("throws when OPENAI_API_KEY is not set", () => {
      expect(() => getProviderConfig("openai", {})).toThrow("OPENAI_API_KEY is not set")
    })

    it("includes organization and project from setting", () => {
      const env = { OPENAI_API_KEY: "test-key" }
      const providerTable = {
        setting: { organization: "org-123", project: "proj-456" },
      } as ProviderTable
      const config = getProviderConfig("openai", env, providerTable)

      expect((config as { organization?: string }).organization).toBe("org-123")
      expect((config as { project?: string }).project).toBe("proj-456")
    })
  })

  describe("ollama", () => {
    it("returns ollama config without API key", () => {
      const config = getProviderConfig("ollama", {})

      expect(config.providerName).toBe("ollama")
    })

    it("uses baseUrl from env", () => {
      const env = { OLLAMA_BASE_URL: "http://localhost:11434" }
      const config = getProviderConfig("ollama", env)

      expect((config as ConfigWithBaseUrl).baseUrl).toBe("http://localhost:11434")
    })
  })

  describe("azure-openai", () => {
    it("returns azure config with required fields", () => {
      const env = {
        AZURE_API_KEY: "test-key",
        AZURE_RESOURCE_NAME: "my-resource",
      }
      const config = getProviderConfig("azure-openai", env)

      expect(config.providerName).toBe("azure-openai")
      expect((config as ConfigWithApiKey).apiKey).toBe("test-key")
      expect((config as { resourceName?: string }).resourceName).toBe("my-resource")
    })

    it("throws when AZURE_API_KEY is not set", () => {
      expect(() => getProviderConfig("azure-openai", {})).toThrow("AZURE_API_KEY is not set")
    })

    it("throws when neither resourceName nor baseUrl is set", () => {
      const env = { AZURE_API_KEY: "test-key" }
      expect(() => getProviderConfig("azure-openai", env)).toThrow(
        "AZURE_RESOURCE_NAME or baseUrl is not set",
      )
    })

    it("accepts baseUrl instead of resourceName", () => {
      const env = { AZURE_API_KEY: "test-key", AZURE_BASE_URL: "https://my.azure.com" }
      const config = getProviderConfig("azure-openai", env)

      expect((config as ConfigWithBaseUrl).baseUrl).toBe("https://my.azure.com")
    })
  })

  describe("amazon-bedrock", () => {
    it("returns bedrock config with required fields", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_REGION: "us-east-1",
      }
      const config = getProviderConfig("amazon-bedrock", env)

      expect(config.providerName).toBe("amazon-bedrock")
      expect((config as { accessKeyId: string }).accessKeyId).toBe("access-key")
      expect((config as { secretAccessKey: string }).secretAccessKey).toBe("secret-key")
      expect((config as { region: string }).region).toBe("us-east-1")
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

    it("includes sessionToken when provided", () => {
      const env = {
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_REGION: "us-east-1",
        AWS_SESSION_TOKEN: "session-token",
      }
      const config = getProviderConfig("amazon-bedrock", env)

      expect((config as { sessionToken?: string }).sessionToken).toBe("session-token")
    })
  })

  describe("google-vertex", () => {
    it("returns vertex config", () => {
      const config = getProviderConfig("google-vertex", {})

      expect(config.providerName).toBe("google-vertex")
    })

    it("uses project and location from env", () => {
      const env = {
        GOOGLE_VERTEX_PROJECT: "my-project",
        GOOGLE_VERTEX_LOCATION: "us-central1",
      }
      const config = getProviderConfig("google-vertex", env)

      expect((config as { project?: string }).project).toBe("my-project")
      expect((config as { location?: string }).location).toBe("us-central1")
    })
  })

  describe("deepseek", () => {
    it("returns deepseek config with API key", () => {
      const env = { DEEPSEEK_API_KEY: "test-key" }
      const config = getProviderConfig("deepseek", env)

      expect(config.providerName).toBe("deepseek")
      expect((config as ConfigWithApiKey).apiKey).toBe("test-key")
    })

    it("throws when DEEPSEEK_API_KEY is not set", () => {
      expect(() => getProviderConfig("deepseek", {})).toThrow("DEEPSEEK_API_KEY is not set")
    })
  })
})
