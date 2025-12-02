import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { api } from "../test/mock-api.js"
import { ApiV1Client } from "./client.js"

describe("@perstack/api-client: ApiV1Client", () => {
  beforeAll(() => api.start())
  afterAll(() => api.stop())
  afterEach(() => api.reset())

  describe("constructor", () => {
    it("should create a new ApiV1Client without config", () => {
      const client = new ApiV1Client()
      expect(client).toBeDefined()
      expect(client.baseUrl).toBe("https://api.perstack.ai")
      expect(client.apiKey).toBeUndefined()
    })

    it("should create a new ApiV1Client with config", () => {
      const client = new ApiV1Client({
        baseUrl: "https://api.example.com",
        apiKey: "1234567890",
      })
      expect(client).toBeDefined()
      expect(client.baseUrl).toBe("https://api.example.com")
      expect(client.apiKey).toBe("1234567890")
    })
  })

  describe("request", () => {
    it("should return a response", async () => {
      api.get("/api/v1/experts", { experts: [] }, 200)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.request("/api/v1/experts")).resolves.toEqual({ experts: [] })
    })

    it("should throw an error if the response is not ok", async () => {
      api.get("/api/v1/experts", { experts: [] }, 500)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.request("/api/v1/experts")).rejects.toThrow(
        "Failed to request https://mock/api/v1/experts: Internal Server Error",
      )
    })
  })

  describe("requestAuthenticated", () => {
    it("should return a response", async () => {
      api.get("/api/v1/experts", { experts: [] }, 200)
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "1234567890" })
      await expect(client.requestAuthenticated("/api/v1/experts")).resolves.toEqual({ experts: [] })
    })

    it("should throw an error if the response is not ok", async () => {
      api.get("/api/v1/experts", { experts: [] }, 500)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.requestAuthenticated("/api/v1/experts")).rejects.toThrow(
        "API key is not set",
      )
    })
  })

  describe("requestBlob", () => {
    it("should return a response", async () => {
      api.getBlob("/api/v1/experts", new Blob(["test content"], { type: "text/plain" }), 200)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.requestBlob("/api/v1/experts")).resolves.toEqual(
        new Blob(["test content"], { type: "text/plain" }),
      )
    })

    it("should throw an error if the response is not ok", async () => {
      api.getBlob("/api/v1/experts", new Blob(["test content"], { type: "text/plain" }), 500)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.requestBlob("/api/v1/experts")).rejects.toThrow(
        "Failed to request https://mock/api/v1/experts: Internal Server Error",
      )
    })
  })

  describe("requestBlobAuthenticated", () => {
    it("should return a response", async () => {
      api.getBlob("/api/v1/experts", new Blob(["test content"], { type: "text/plain" }), 200)
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "1234567890" })
      await expect(client.requestBlobAuthenticated("/api/v1/experts")).resolves.toEqual(
        new Blob(["test content"], { type: "text/plain" }),
      )
    })

    it("should throw an error if the response is not ok", async () => {
      api.get("/api/v1/experts", { experts: [] }, 500)
      const client = new ApiV1Client({ baseUrl: "https://mock" })
      await expect(client.requestBlobAuthenticated("/api/v1/experts")).rejects.toThrow(
        "API key is not set",
      )
    })
  })
})
