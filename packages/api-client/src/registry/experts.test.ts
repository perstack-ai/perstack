import { HttpResponse, http } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createFetcher } from "../fetcher.js"
import { createRegistryExpertsApi } from "./experts.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE_URL = "https://api.perstack.ai"

const createMockExpert = (overrides = {}) => ({
  type: "registryExpert" as const,
  id: "test-id",
  key: "my-expert@1.0.0",
  name: "my-expert",
  minRuntimeVersion: "v1.0" as const,
  description: "Test expert",
  owner: {
    name: "test-org",
    organizationId: "org123456789012345678901",
    createdAt: "2024-01-01T00:00:00Z",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  version: "1.0.0",
  status: "available" as const,
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: ["latest"],
  ...overrides,
})

describe("createRegistryExpertsApi", () => {
  const fetcher = createFetcher()
  const api = createRegistryExpertsApi(fetcher)

  describe("get", () => {
    it("returns expert on success", async () => {
      const mockExpert = createMockExpert()
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/:key`, () => {
          return HttpResponse.json({ data: { expert: mockExpert } })
        }),
      )

      const result = await api.get("my-expert@1.0.0")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe("my-expert")
        expect(result.data.createdAt).toBeInstanceOf(Date)
      }
    })

    it("properly encodes expertKey in URL", async () => {
      let capturedUrl = ""
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/:key`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({ data: { expert: createMockExpert() } })
        }),
      )

      await api.get("@perstack/base@1.0.0")
      expect(capturedUrl).toContain("%40perstack%2Fbase%401.0.0")
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.get("not-found")
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(404)
      }
    })
  })

  describe("list", () => {
    it("returns experts on success", async () => {
      const mockExperts = [createMockExpert()]
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/`, () => {
          return HttpResponse.json({
            data: { experts: mockExperts },
            meta: { total: 1, take: 100, skip: 0 },
          })
        }),
      )

      const result = await api.list()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.meta.total).toBe(1)
      }
    })

    it("includes query parameters when provided", async () => {
      let capturedUrl = ""
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({
            data: { experts: [] },
            meta: { total: 0, take: 50, skip: 10 },
          })
        }),
      )

      await api.list({
        organizationId: "org123",
        filter: "test",
        sort: "name",
        order: "asc",
        take: 50,
        skip: 10,
      })

      expect(capturedUrl).toContain("organizationId=org123")
      expect(capturedUrl).toContain("filter=test")
      expect(capturedUrl).toContain("sort=name")
      expect(capturedUrl).toContain("order=asc")
      expect(capturedUrl).toContain("take=50")
      expect(capturedUrl).toContain("skip=10")
    })

    it("omits query parameters when not provided", async () => {
      let capturedUrl = ""
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({
            data: { experts: [] },
            meta: { total: 0, take: 100, skip: 0 },
          })
        }),
      )

      await api.list()
      expect(capturedUrl).not.toContain("filter=")
      expect(capturedUrl).not.toContain("sort=")
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
        }),
      )

      const result = await api.list()
      expect(result.ok).toBe(false)
    })
  })

  describe("create", () => {
    it("creates expert on success", async () => {
      let capturedBody: unknown
      server.use(
        http.post(`${BASE_URL}/api/registry/v1/experts/`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ data: { expert: createMockExpert() } })
        }),
      )

      const result = await api.create({
        name: "my-expert",
        version: "1.0.0",
        minRuntimeVersion: "v1.0",
        description: "Test",
        instruction: "Test instruction",
        skills: {},
      })

      expect(capturedBody).toEqual({
        name: "my-expert",
        version: "1.0.0",
        minRuntimeVersion: "v1.0",
        description: "Test",
        instruction: "Test instruction",
        skills: {},
      })
      expect(result.ok).toBe(true)
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/registry/v1/experts/`, () => {
          return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
        }),
      )

      const result = await api.create({
        name: "my-expert",
        version: "1.0.0",
        minRuntimeVersion: "v1.0",
        description: "Test",
        instruction: "Test instruction",
        skills: {},
      })

      expect(result.ok).toBe(false)
    })
  })

  describe("update", () => {
    it("updates expert on success", async () => {
      let capturedBody: unknown
      server.use(
        http.post(`${BASE_URL}/api/registry/v1/experts/:key`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ data: { expert: createMockExpert({ status: "deprecated" }) } })
        }),
      )

      const result = await api.update("my-expert@1.0.0", { status: "deprecated" })

      expect(capturedBody).toEqual({ status: "deprecated" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.status).toBe("deprecated")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/registry/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.update("not-found", { status: "deprecated" })
      expect(result.ok).toBe(false)
    })
  })

  describe("delete", () => {
    it("deletes expert on success", async () => {
      let capturedUrl = ""
      server.use(
        http.delete(`${BASE_URL}/api/registry/v1/experts/:key`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }),
      )

      const result = await api.delete("my-expert@1.0.0")

      expect(capturedUrl).toContain("my-expert%401.0.0")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeUndefined()
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/registry/v1/experts/:key`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.delete("not-found")
      expect(result.ok).toBe(false)
    })
  })

  describe("getVersions", () => {
    it("returns versions on success", async () => {
      const mockVersions = [
        {
          type: "expertDigest" as const,
          id: "id-1",
          key: "my-expert@1.0.0",
          name: "my-expert",
          minRuntimeVersion: "v1.0" as const,
          description: "Test",
          owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          version: "1.0.0",
          tags: ["latest"],
        },
      ]
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/:key/versions`, () => {
          return HttpResponse.json({
            data: { versions: mockVersions, latest: "1.0.0" },
            meta: { total: 1 },
          })
        }),
      )

      const result = await api.getVersions("my-expert")

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.versions).toHaveLength(1)
        expect(result.data.latest).toBe("1.0.0")
        expect(result.data.total).toBe(1)
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/registry/v1/experts/:key/versions`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.getVersions("not-found")
      expect(result.ok).toBe(false)
    })
  })
})
