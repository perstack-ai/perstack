import { HttpResponse, http } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createFetcher } from "../fetcher.js"
import { createStudioExpertsApi } from "./experts.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE_URL = "https://api.perstack.ai"

const createMockStudioExpert = (overrides = {}) => ({
  type: "studioExpert" as const,
  id: "test-id",
  key: "my-expert",
  name: "my-expert",
  minRuntimeVersion: "v1.0" as const,
  description: "Test expert",
  owner: {
    organizationId: "org123456789012345678901",
    createdAt: "2024-01-01T00:00:00Z",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  application: { id: "app-123", name: "test-app" },
  ...overrides,
})

const createMockExpertDigest = (overrides = {}) => ({
  type: "expertDigest" as const,
  id: "test-id",
  key: "my-expert",
  name: "my-expert",
  minRuntimeVersion: "v1.0" as const,
  description: "Test expert",
  owner: {
    organizationId: "org123456789012345678901",
    createdAt: "2024-01-01T00:00:00Z",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  tags: [],
  ...overrides,
})

describe("createStudioExpertsApi", () => {
  const fetcher = createFetcher()
  const api = createStudioExpertsApi(fetcher)

  describe("get", () => {
    it("returns expert on success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/experts/:key`, () => {
          return HttpResponse.json({ data: { expert: createMockStudioExpert() } })
        }),
      )

      const result = await api.get("my-expert")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe("my-expert")
        expect(result.data.type).toBe("studioExpert")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.get("not-found")
      expect(result.ok).toBe(false)
    })
  })

  describe("list", () => {
    it("returns experts on success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/experts/`, () => {
          return HttpResponse.json({
            data: { experts: [createMockExpertDigest()] },
            meta: { total: 1, take: 100, skip: 0 },
          })
        }),
      )

      const result = await api.list({ applicationId: "app-123" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.meta.total).toBe(1)
      }
    })

    it("includes query parameters", async () => {
      let capturedUrl = ""
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/experts/`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({
            data: { experts: [] },
            meta: { total: 0, take: 50, skip: 10 },
          })
        }),
      )

      await api.list({
        applicationId: "app-123",
        filter: "test",
        sort: "name",
        order: "asc",
        take: 50,
        skip: 10,
      })

      expect(capturedUrl).toContain("applicationId=app-123")
      expect(capturedUrl).toContain("filter=test")
      expect(capturedUrl).toContain("sort=name")
      expect(capturedUrl).toContain("order=asc")
      expect(capturedUrl).toContain("take=50")
      expect(capturedUrl).toContain("skip=10")
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/experts/`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
        }),
      )

      const result = await api.list({ applicationId: "app-123" })
      expect(result.ok).toBe(false)
    })
  })

  describe("create", () => {
    it("creates expert on success", async () => {
      let capturedBody: unknown
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/experts/`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ data: { expert: createMockStudioExpert() } })
        }),
      )

      const result = await api.create({
        name: "my-expert",
        minRuntimeVersion: "v1.0",
        description: "Test",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
      })

      expect(capturedBody).toBeDefined()
      expect(result.ok).toBe(true)
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/experts/`, () => {
          return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
        }),
      )

      const result = await api.create({
        name: "my-expert",
        minRuntimeVersion: "v1.0",
        description: "Test",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
      })

      expect(result.ok).toBe(false)
    })
  })

  describe("update", () => {
    it("updates expert on success", async () => {
      let capturedBody: unknown
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/experts/:key`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({
            data: { expert: createMockStudioExpert({ description: "Updated" }) },
          })
        }),
      )

      const result = await api.update("my-expert", { description: "Updated" })

      expect(capturedBody).toEqual({ description: "Updated" })
      expect(result.ok).toBe(true)
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.update("not-found", { description: "Updated" })
      expect(result.ok).toBe(false)
    })
  })

  describe("delete", () => {
    it("deletes expert on success", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/studio/v1/experts/:key`, () => {
          return HttpResponse.json({})
        }),
      )

      const result = await api.delete("my-expert")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeUndefined()
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/studio/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.delete("not-found")
      expect(result.ok).toBe(false)
    })
  })
})
