import { describe, expect, it, beforeEach } from "vitest"
import type { AnthropicProviderConfig } from "@perstack/core"
import { ProviderAdapterFactory, ProviderNotInstalledError } from "./provider-adapter-factory.js"

describe("ProviderAdapterFactory", () => {
  beforeEach(() => {
    ProviderAdapterFactory.clearCache()
  })

  describe("ProviderNotInstalledError", () => {
    it("creates error with correct message for standard provider", () => {
      const error = new ProviderNotInstalledError("anthropic")
      expect(error.message).toBe(
        'Provider "anthropic" is not installed. Run: npm install @perstack/anthropic-provider',
      )
      expect(error.name).toBe("ProviderNotInstalledError")
    })

    it("creates error with correct message for amazon-bedrock", () => {
      const error = new ProviderNotInstalledError("amazon-bedrock")
      expect(error.message).toBe(
        'Provider "amazon-bedrock" is not installed. Run: npm install @perstack/bedrock-provider',
      )
    })

    it("creates error with correct message for google-vertex", () => {
      const error = new ProviderNotInstalledError("google-vertex")
      expect(error.message).toBe(
        'Provider "google-vertex" is not installed. Run: npm install @perstack/vertex-provider',
      )
    })
  })

  describe("create", () => {
    it("throws ProviderNotInstalledError for unregistered provider", async () => {
      ProviderAdapterFactory.clearCache()
      const config: AnthropicProviderConfig = {
        providerName: "anthropic",
        apiKey: "test-key",
      }

      // Clear all registrations by creating fresh state
      // Note: This test verifies error handling for unregistered providers
      await expect(ProviderAdapterFactory.create(config)).rejects.toThrow(
        ProviderNotInstalledError,
      )
    })
  })

  describe("clearCache", () => {
    it("clears the instance cache", () => {
      // This is a basic test to ensure clearCache doesn't throw
      expect(() => ProviderAdapterFactory.clearCache()).not.toThrow()
    })
  })
})
