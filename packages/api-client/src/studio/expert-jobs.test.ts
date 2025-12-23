import { HttpResponse, http } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createFetcher } from "../fetcher.js"
import { createStudioExpertJobsApi } from "./expert-jobs.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE_URL = "https://api.perstack.ai"

const createMockJob = (overrides = {}) => ({
  id: "job-123",
  expertKey: "my-expert@1.0.0",
  status: "pending" as const,
  query: "Test query",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

const createMockCheckpoint = (overrides = {}) => ({
  id: "cp-123",
  expertJobId: "job-123",
  sequence: 1,
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

const createMockWorkspaceInstance = (overrides = {}) => ({
  id: "wi-123",
  expertJobId: "job-123",
  createdAt: "2024-01-01T00:00:00Z",
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

describe("createStudioExpertJobsApi", () => {
  const fetcher = createFetcher()
  const api = createStudioExpertJobsApi(fetcher)

  describe("get", () => {
    it("returns job on success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:id`, () => {
          return HttpResponse.json({ data: { expertJob: createMockJob() } })
        }),
      )

      const result = await api.get("job-123")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe("job-123")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:id`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.get("not-found")
      expect(result.ok).toBe(false)
    })
  })

  describe("list", () => {
    it("returns jobs on success", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/expert_jobs/`, () => {
          return HttpResponse.json({
            data: { expertJobs: [createMockJob()] },
            meta: { total: 1, take: 100, skip: 0 },
          })
        }),
      )

      const result = await api.list({ applicationId: "app-123" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.data).toHaveLength(1)
      }
    })

    it("includes query parameters", async () => {
      let capturedUrl = ""
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/expert_jobs/`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({
            data: { expertJobs: [] },
            meta: { total: 0, take: 50, skip: 10 },
          })
        }),
      )

      await api.list({
        applicationId: "app-123",
        filter: "test",
        sort: "createdAt",
        order: "desc",
        take: 50,
        skip: 10,
      })

      expect(capturedUrl).toContain("applicationId=app-123")
      expect(capturedUrl).toContain("filter=test")
      expect(capturedUrl).toContain("sort=createdAt")
      expect(capturedUrl).toContain("order=desc")
    })

    it("returns error on failure", async () => {
      server.use(
        http.get(`${BASE_URL}/api/studio/v1/expert_jobs/`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
        }),
      )

      const result = await api.list({ applicationId: "app-123" })
      expect(result.ok).toBe(false)
    })
  })

  describe("start", () => {
    it("starts job on success", async () => {
      let capturedBody: unknown
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ data: { expertJob: createMockJob() } })
        }),
      )

      const result = await api.start({
        expertKey: "my-expert@1.0.0",
        query: "Test query",
      })

      expect(capturedBody).toEqual({
        expertKey: "my-expert@1.0.0",
        query: "Test query",
      })
      expect(result.ok).toBe(true)
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/`, () => {
          return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
        }),
      )

      const result = await api.start({
        expertKey: "my-expert",
        query: "Test",
      })
      expect(result.ok).toBe(false)
    })
  })

  describe("continue", () => {
    it("continues job on success", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:id/continue`, () => {
          return HttpResponse.json({ data: { expertJob: createMockJob({ status: "running" }) } })
        }),
      )

      const result = await api.continue("job-123", { response: "User response" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.status).toBe("running")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:id/continue`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.continue("not-found", { response: "response" })
      expect(result.ok).toBe(false)
    })
  })

  describe("update", () => {
    it("updates job on success", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:id`, () => {
          return HttpResponse.json({ data: { expertJob: createMockJob({ status: "cancelled" }) } })
        }),
      )

      const result = await api.update("job-123", { status: "cancelled" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.status).toBe("cancelled")
      }
    })

    it("returns error on failure", async () => {
      server.use(
        http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:id`, () => {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 })
        }),
      )

      const result = await api.update("not-found", { status: "cancelled" })
      expect(result.ok).toBe(false)
    })
  })

  describe("checkpoints", () => {
    describe("get", () => {
      it("returns checkpoint on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/:cpId`, () => {
            return HttpResponse.json({ data: { checkpoint: createMockCheckpoint() } })
          }),
        )

        const result = await api.checkpoints.get("job-123", "cp-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.id).toBe("cp-123")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/:cpId`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.checkpoints.get("job-123", "not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("list", () => {
      it("returns checkpoints on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/`, () => {
            return HttpResponse.json({
              data: { checkpoints: [createMockCheckpoint()] },
              meta: { total: 1, take: 100, skip: 0 },
            })
          }),
        )

        const result = await api.checkpoints.list("job-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.data).toHaveLength(1)
        }
      })

      it("includes query parameters", async () => {
        let capturedUrl = ""
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/`, ({ request }) => {
            capturedUrl = request.url
            return HttpResponse.json({
              data: { checkpoints: [] },
              meta: { total: 0, take: 50, skip: 10 },
            })
          }),
        )

        await api.checkpoints.list("job-123", {
          take: 50,
          skip: 10,
          sort: "sequence",
          order: "asc",
        })

        expect(capturedUrl).toContain("take=50")
        expect(capturedUrl).toContain("skip=10")
        expect(capturedUrl).toContain("sort=sequence")
        expect(capturedUrl).toContain("order=asc")
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.checkpoints.list("not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("create", () => {
      it("creates checkpoint on success", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/`, () => {
            return HttpResponse.json({ data: { checkpoint: createMockCheckpoint() } })
          }),
        )

        const result = await api.checkpoints.create("job-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.id).toBe("cp-123")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.post(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/checkpoints/`, () => {
            return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
          }),
        )

        const result = await api.checkpoints.create("not-found")
        expect(result.ok).toBe(false)
      })
    })
  })

  describe("workspaceInstance", () => {
    describe("get", () => {
      it("returns workspace instance on success", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/`, () => {
            return HttpResponse.json({
              data: { workspaceInstance: createMockWorkspaceInstance() },
            })
          }),
        )

        const result = await api.workspaceInstance.get("job-123")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.id).toBe("wi-123")
        }
      })

      it("returns error on failure", async () => {
        server.use(
          http.get(`${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/`, () => {
            return HttpResponse.json({ error: "Not Found" }, { status: 404 })
          }),
        )

        const result = await api.workspaceInstance.get("not-found")
        expect(result.ok).toBe(false)
      })
    })

    describe("items", () => {
      describe("get", () => {
        it("returns item on success", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
              },
            ),
          )

          const result = await api.workspaceInstance.items.get("job-123", "item-123")
          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.data.id).toBe("item-123")
          }
        })

        it("returns error on failure", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const result = await api.workspaceInstance.items.get("job-123", "not-found")
          expect(result.ok).toBe(false)
        })
      })

      describe("list", () => {
        it("returns items on success", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/`,
              () => {
                return HttpResponse.json({
                  data: { items: [createMockWorkspaceItem()] },
                  meta: { total: 1, take: 100, skip: 0 },
                })
              },
            ),
          )

          const result = await api.workspaceInstance.items.list("job-123")
          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.data.data).toHaveLength(1)
          }
        })

        it("includes query parameters", async () => {
          let capturedUrl = ""
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/`,
              ({ request }) => {
                capturedUrl = request.url
                return HttpResponse.json({
                  data: { items: [] },
                  meta: { total: 0, take: 50, skip: 10 },
                })
              },
            ),
          )

          await api.workspaceInstance.items.list("job-123", {
            take: 50,
            skip: 10,
            path: "/subdir",
          })

          expect(capturedUrl).toContain("take=50")
          expect(capturedUrl).toContain("skip=10")
          expect(capturedUrl).toContain("path=%2Fsubdir")
        })

        it("returns error on failure", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const result = await api.workspaceInstance.items.list("not-found")
          expect(result.ok).toBe(false)
        })
      })

      describe("create", () => {
        it("creates item on success", async () => {
          server.use(
            http.post(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/`,
              () => {
                return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
              },
            ),
          )

          const blob = new Blob(["test content"])
          const result = await api.workspaceInstance.items.create("job-123", "/test.txt", blob)
          expect(result.ok).toBe(true)
        })

        it("returns error on failure", async () => {
          server.use(
            http.post(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/`,
              () => {
                return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
              },
            ),
          )

          const blob = new Blob(["test"])
          const result = await api.workspaceInstance.items.create("job-123", "/test.txt", blob)
          expect(result.ok).toBe(false)
        })
      })

      describe("update", () => {
        it("updates item on success", async () => {
          server.use(
            http.post(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({ data: { item: createMockWorkspaceItem() } })
              },
            ),
          )

          const blob = new Blob(["updated content"])
          const result = await api.workspaceInstance.items.update("job-123", "item-123", blob)
          expect(result.ok).toBe(true)
        })

        it("returns error on failure", async () => {
          server.use(
            http.post(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const blob = new Blob(["test"])
          const result = await api.workspaceInstance.items.update("job-123", "not-found", blob)
          expect(result.ok).toBe(false)
        })
      })

      describe("delete", () => {
        it("deletes item on success", async () => {
          server.use(
            http.delete(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({})
              },
            ),
          )

          const result = await api.workspaceInstance.items.delete("job-123", "item-123")
          expect(result.ok).toBe(true)
        })

        it("returns error on failure", async () => {
          server.use(
            http.delete(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const result = await api.workspaceInstance.items.delete("job-123", "not-found")
          expect(result.ok).toBe(false)
        })
      })

      describe("download", () => {
        it("downloads item on success", async () => {
          const blobData = new Uint8Array([1, 2, 3, 4, 5])
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId/download`,
              () => {
                return new HttpResponse(blobData, {
                  headers: { "Content-Type": "application/octet-stream" },
                })
              },
            ),
          )

          const result = await api.workspaceInstance.items.download("job-123", "item-123")
          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.data).toBeInstanceOf(Blob)
          }
        })

        it("returns error on failure", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/:itemId/download`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const result = await api.workspaceInstance.items.download("job-123", "not-found")
          expect(result.ok).toBe(false)
        })
      })

      describe("find", () => {
        it("finds items on success", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/find`,
              () => {
                return HttpResponse.json({ data: { items: [createMockWorkspaceItem()] } })
              },
            ),
          )

          const result = await api.workspaceInstance.items.find("job-123", "*.txt")
          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.data).toHaveLength(1)
          }
        })

        it("returns error on failure", async () => {
          server.use(
            http.get(
              `${BASE_URL}/api/studio/v1/expert_jobs/:jobId/workspace_instance/items/find`,
              () => {
                return HttpResponse.json({ error: "Not Found" }, { status: 404 })
              },
            ),
          )

          const result = await api.workspaceInstance.items.find("not-found", "*")
          expect(result.ok).toBe(false)
        })
      })
    })
  })
})
