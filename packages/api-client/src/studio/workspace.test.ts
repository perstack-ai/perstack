import { HttpResponse, http } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createFetcher } from "../fetcher.js"
import { createStudioWorkspaceApi } from "./workspace.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE_URL = "https://api.perstack.ai"

const createMockWorkspace = (overrides = {}) => ({
  id: "ws-123",
  applicationId: "app-123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

const createMockWorkspaceItem = (overrides = {}) => ({
  id: "item-123",
  path: "/test.txt",
  type: "file" as const,
  size: 1024,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

const createMockVariable = (overrides = {}) => ({
  name: "MY_VAR",
  value: "my-value",
  ...overrides,
})

const createMockSecret = (overrides = {}) => ({
  name: "MY_SECRET",
  ...overrides,
})

describe("createStudioWorkspaceApi", () => {
  const fetcher = createFetcher()
  const api = createStudioWorkspaceApi(fetcher)

  describe("get", () => {
    it("returns workspace on success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/workspace/`, () => {
          return HttpResponse.json({ data: { workspace: createMockWorkspace() } })
        }),
      )

      const result = await api.get()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe("ws-123")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/workspace/`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
        }),
      )

      const result = await api.get()
      expect(result.ok).toBe(false)
    })
  })

  describe("items", () => {
    describe("get", () => {
      it("returns item on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
          }),
        )

        const result = await api.items.get("item-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.id).toBe("item-123")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.items.get("not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("list", () => {
      it("returns items on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/`, () => {
            return HttpResponse.json({
              data: { items: [createMockWorkspaceItem()] },
              meta: { total: 1, take: 100, skip: 0 },
            })
          }),
        )

        const result = await api.items.list()
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.data).toHaveLength(1)
        }
      })

      it("includes query parameters", async () => {
        let capturedUrl = ""
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/`, ({ request }) => {
            capturedUrl = request.url
            return HttpResponse.json({
              data: { items: [] },
              meta: { total: 0, take: 50, skip: 10 },
            })
          }),
        )

        await api.items.list({ take: 50, skip: 10, path: "/subdir" })

        expect(capturedUrl).toContain("take=50")
        expect(capturedUrl).toContain("skip=10")
        expect(capturedUrl).toContain("path=%2Fsubdir")
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/`, () => {
            return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
          }),
        )

        const result = await api.items.list()
        expect(result.ok).toBe(false)
      })
    })

    describe("create", () => {
      it("creates item on success", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/items/`, () => {
            return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
          }),
        )

        const blob = new Blob(["test content"])
        const result = await api.items.create("/test.txt", blob)
        expect(result.ok).toBe(true)
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/items/`, () => {
            return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
          }),
        )

        const blob = new Blob(["test"])
        const result = await api.items.create("/test.txt", blob)
        expect(result.ok).toBe(false)
      })
    })

    describe("update", () => {
      it("updates item on success", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
          }),
        )

        const blob = new Blob(["updated content"])
        const result = await api.items.update("item-123", blob)
        expect(result.ok).toBe(true)
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const blob = new Blob(["test"])
        const result = await api.items.update("not-found", blob)
        expect(result.ok).toBe(false)
      })
    })

    describe("delete", () => {
      it("deletes item on success", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({})
          }),
        )

        const result = await api.items.delete("item-123")
        expect(result.ok).toBe(true)
      })

      it("returns error on failure", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/items/:itemId`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.items.delete("not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("download", () => {
      it("downloads item on success", async () => {
        const blobData = new Uint8Array([1, 2, 3, 4, 5])
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/:itemId/download`, () => {
            return new HttpResponse(blobData, {
              headers: { "Content-Type": "application/octet-stream" },
            })
          }),
        )

        const result = await api.items.download("item-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data).toBeInstanceOf(Blob)
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/:itemId/download`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.items.download("not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("find", () => {
      it("finds items on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/find`, () => {
            return HttpResponse.json({ data: { items: [createMockWorkspaceItem()] } })
          }),
        )

        const result = await api.items.find("*.txt")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data).toHaveLength(1)
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/workspace/items/find`, () => {
            return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
          }),
        )

        const result = await api.items.find("*")
        expect(result.ok).toBe(false)
      })
    })
  })

  describe("variables", () => {
    describe("create", () => {
      it("creates variable on success", async () => {
        let capturedBody: unknown
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/variables/`, async ({ request }) => {
            capturedBody = await request.json()
            return HttpResponse.json({ data: { variable: createMockVariable() } })
          }),
        )

        const result = await api.variables.create({ name: "MY_VAR", value: "my-value" })

        expect(capturedBody).toEqual({ name: "MY_VAR", value: "my-value" })
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.name).toBe("MY_VAR")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/variables/`, () => {
            return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
          }),
        )

        const result = await api.variables.create({ name: "MY_VAR", value: "val" })
        expect(result.ok).toBe(false)
      })
    })

    describe("update", () => {
      it("updates variable on success", async () => {
        let capturedBody: unknown
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/variables/:name`, async ({ request }) => {
            capturedBody = await request.json()
            return HttpResponse.json({
              data: { variable: createMockVariable({ value: "new-value" }) },
            })
          }),
        )

        const result = await api.variables.update("MY_VAR", { value: "new-value" })

        expect(capturedBody).toEqual({ value: "new-value" })
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.value).toBe("new-value")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/variables/:name`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.variables.update("NOT_FOUND", { value: "val" })
        expect(result.ok).toBe(false)
      })
    })

    describe("delete", () => {
      it("deletes variable on success", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/variables/:name`, () => {
            return HttpResponse.json({})
          }),
        )

        const result = await api.variables.delete("MY_VAR")
        expect(result.ok).toBe(true)
      })

      it("returns error on failure", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/variables/:name`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.variables.delete("NOT_FOUND")
        expect(result.ok).toBe(false)
      })
    })
  })

  describe("secrets", () => {
    describe("create", () => {
      it("creates secret on success", async () => {
        let capturedBody: unknown
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/secrets/`, async ({ request }) => {
            capturedBody = await request.json()
            return HttpResponse.json({ data: { secret: createMockSecret() } })
          }),
        )

        const result = await api.secrets.create({ name: "MY_SECRET", value: "secret-value" })

        expect(capturedBody).toEqual({ name: "MY_SECRET", value: "secret-value" })
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.name).toBe("MY_SECRET")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/workspace/secrets/`, () => {
            return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
          }),
        )

        const result = await api.secrets.create({ name: "MY_SECRET", value: "val" })
        expect(result.ok).toBe(false)
      })
    })

    describe("delete", () => {
      it("deletes secret on success", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/secrets/:name`, () => {
            return HttpResponse.json({})
          }),
        )

        const result = await api.secrets.delete("MY_SECRET")
        expect(result.ok).toBe(true)
      })

      it("returns error on failure", async () => {
        server.use(
          http.delete(`${BASE_URL}/api/studio/v1/workspace/secrets/:name`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.secrets.delete("NOT_FOUND")
        expect(result.ok).toBe(false)
      })
    })
  })
})
