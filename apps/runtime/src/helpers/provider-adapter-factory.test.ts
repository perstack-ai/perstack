import type { AnthropicProviderConfig } from "@perstack/core"
import { beforeEach, describe, expect, it } from "vitest"
import {
  clearProviderAdapterCache,
  createProviderAdapter,
  ProviderNotInstalledError,
} from "./provider-adapter-factory.js"

describe("Provider Adapter Factory", () => {
  beforeEach(() => {
    clearProviderAdapterCache()
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

  describe("createProviderAdapter", () => {
    it("throws ProviderNotInstalledError for unregistered provider", async () => {
      clearProviderAdapterCache()
      const config: AnthropicProviderConfig = {
        providerName: "anthropic",
        apiKey: "test-key",
      }

      // Clear all registrations by creating fresh state
      // Note: This test verifies error handling for unregistered providers
      await expect(createProviderAdapter(config)).rejects.toThrow(ProviderNotInstalledError)
    })
  })

  describe("clearProviderAdapterCache", () => {
    it("clears the instance cache", () => {
      // This is a basic test to ensure clearProviderAdapterCache doesn't throw
      expect(() => clearProviderAdapterCache()).not.toThrow()
    })
  })
})
