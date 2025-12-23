import { describe, expect, it } from "vitest"
import * as ApiClient from "./index.js"

describe("@perstack/api-client exports", () => {
  describe("main exports", () => {
    it("exports createApiClient", () => {
      expect(ApiClient.createApiClient).toBeInstanceOf(Function)
    })

    it("exports createFetcher", () => {
      expect(ApiClient.createFetcher).toBeInstanceOf(Function)
    })
  })

  describe("registry exports", () => {
    it("exports createRegistryExpertsApi", () => {
      expect(ApiClient.createRegistryExpertsApi).toBeInstanceOf(Function)
    })
  })

  describe("studio exports", () => {
    it("exports createStudioExpertsApi", () => {
      expect(ApiClient.createStudioExpertsApi).toBeInstanceOf(Function)
    })

    it("exports createStudioExpertJobsApi", () => {
      expect(ApiClient.createStudioExpertJobsApi).toBeInstanceOf(Function)
    })

    it("exports createStudioWorkspaceApi", () => {
      expect(ApiClient.createStudioWorkspaceApi).toBeInstanceOf(Function)
    })
  })
})
