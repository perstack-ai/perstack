import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createApiClient } from "./client.js"
import { overrideErrorHandler, overrideHandler } from "./test-utils/mock-server.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("createApiClient", () => {
  it("creates a client with all namespaces", () => {
    const client = createApiClient()
    expect(client.registry).toBeDefined()
    expect(client.registry.experts).toBeDefined()
    expect(client.studio).toBeDefined()
    expect(client.studio.experts).toBeDefined()
    expect(client.studio.expertJobs).toBeDefined()
    expect(client.studio.workspace).toBeDefined()
  })

  it("accepts custom baseUrl and apiKey", () => {
    const client = createApiClient({
      baseUrl: "https://custom.api.com",
      apiKey: "test-key",
    })
    expect(client).toBeDefined()
  })

  it("accepts timeout configuration", () => {
    const client = createApiClient({
      timeout: 5000,
    })
    expect(client).toBeDefined()
  })
})

describe("registry.experts", () => {
  describe("get", () => {
    it("returns an expert on success", async () => {
      const mockExpert = {
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
      }

      server.use(
        overrideHandler("get", "/api/registry/v1/experts/my-expert%401.0.0", {
          data: { expert: mockExpert },
        }),
      )

      const client = createApiClient()
      const result = await client.registry.experts.get("my-expert@1.0.0")

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe("my-expert")
        expect(result.data.version).toBe("1.0.0")
      }
    })

    it("returns error on 404", async () => {
      server.use(
        overrideErrorHandler("get", "/api/registry/v1/experts/not-found%401.0.0", {
          code: 404,
          error: "Not Found",
          reason: "Expert not found",
        }),
      )

      const client = createApiClient()
      const result = await client.registry.experts.get("not-found@1.0.0")

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(404)
        expect(result.error.message).toBe("Not Found")
      }
    })
  })

  describe("list", () => {
    it("returns paginated experts", async () => {
      const mockExperts = [
        {
          type: "registryExpert" as const,
          id: "test-id",
          key: "expert-1@1.0.0",
          name: "expert-1",
          minRuntimeVersion: "v1.0" as const,
          description: "Test expert 1",
          owner: {
            organizationId: "org123456789012345678901",
            createdAt: "2024-01-01T00:00:00Z",
          },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          version: "1.0.0",
          status: "available" as const,
          instruction: "Test",
          skills: {},
          delegates: [],
          tags: [],
        },
      ]

      server.use(
        overrideHandler("get", "/api/registry/v1/experts/", {
          data: { experts: mockExperts },
          meta: { total: 1, take: 100, skip: 0 },
        }),
      )

      const client = createApiClient()
      const result = await client.registry.experts.list()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.meta.total).toBe(1)
      }
    })
  })
})

describe("studio.experts", () => {
  describe("get", () => {
    it("returns a studio expert", async () => {
      const mockExpert = {
        type: "studioExpert" as const,
        id: "test-id",
        key: "my-studio-expert",
        name: "my-studio-expert",
        minRuntimeVersion: "v1.0" as const,
        description: "Test studio expert",
        owner: {
          organizationId: "org123456789012345678901",
          createdAt: "2024-01-01T00:00:00Z",
        },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        application: {
          id: "app123",
          name: "test-app",
        },
      }

      server.use(
        overrideHandler("get", "/api/studio/v1/experts/my-studio-expert", {
          data: { expert: mockExpert },
        }),
      )

      const client = createApiClient()
      const result = await client.studio.experts.get("my-studio-expert")

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.type).toBe("studioExpert")
        expect(result.data.name).toBe("my-studio-expert")
      }
    })
  })
})

describe("studio.expertJobs", () => {
  describe("start", () => {
    it("starts a new expert job", async () => {
      const mockJob = {
        id: "job-123",
        expertKey: "my-expert@1.0.0",
        status: "pending" as const,
        query: "Test query",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      server.use(
        overrideHandler("post", "/api/studio/v1/expert_jobs/", {
          data: { expertJob: mockJob },
        }),
      )

      const client = createApiClient()
      const result = await client.studio.expertJobs.start({
        expertKey: "my-expert@1.0.0",
        query: "Test query",
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe("job-123")
        expect(result.data.status).toBe("pending")
      }
    })
  })
})

describe("studio.workspace", () => {
  describe("get", () => {
    it("returns workspace info", async () => {
      const mockWorkspace = {
        id: "ws-123",
        applicationId: "app-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }

      server.use(
        overrideHandler("get", "/api/studio/v1/workspace/", {
          data: { workspace: mockWorkspace },
        }),
      )

      const client = createApiClient()
      const result = await client.studio.workspace.get()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe("ws-123")
      }
    })
  })
})
