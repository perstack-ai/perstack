import { HttpResponse, http } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { z } from "zod"
import { createFetcher } from "./fetcher.js"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE_URL = "https://api.perstack.ai"

describe("createFetcher", () => {
  it("creates a fetcher with default config", () => {
    const fetcher = createFetcher()
    expect(fetcher).toBeDefined()
    expect(fetcher.get).toBeInstanceOf(Function)
    expect(fetcher.post).toBeInstanceOf(Function)
    expect(fetcher.delete).toBeInstanceOf(Function)
    expect(fetcher.getBlob).toBeInstanceOf(Function)
  })

  it("uses custom baseUrl", async () => {
    const customUrl = "https://custom.api.com"
    server.use(
      http.get(`${customUrl}/test`, () => {
        return HttpResponse.json({ value: "custom" })
      }),
    )

    const fetcher = createFetcher({ baseUrl: customUrl })
    const schema = z.object({ value: z.string() })
    const result = await fetcher.get("/test", schema)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.value).toBe("custom")
    }
  })

  it("sets authorization header when apiKey is provided", async () => {
    let capturedAuth: string | null = null
    server.use(
      http.get(`${BASE_URL}/test`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ ok: true })
      }),
    )

    const fetcher = createFetcher({ apiKey: "test-api-key" })
    const schema = z.object({ ok: z.boolean() })
    await fetcher.get("/test", schema)

    expect(capturedAuth).toBe("Bearer test-api-key")
  })

  it("does not set authorization header when apiKey is not provided", async () => {
    let capturedAuth: string | null = null
    server.use(
      http.get(`${BASE_URL}/test`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ ok: true })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ ok: z.boolean() })
    await fetcher.get("/test", schema)

    expect(capturedAuth).toBeNull()
  })
})

describe("fetcher.get", () => {
  it("returns parsed data on success", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, () => {
        return HttpResponse.json({ id: 123, name: "test" })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number(), name: z.string() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ id: 123, name: "test" })
    }
  })

  it("returns error on HTTP error with JSON body", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, () => {
        return HttpResponse.json(
          { error: "Not Found", reason: "Resource not found" },
          { status: 404 },
        )
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(404)
      expect(result.error.message).toBe("Not Found")
      expect(result.error.reason).toBe("Resource not found")
    }
  })

  it("returns error on HTTP error without JSON body", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, () => {
        return new HttpResponse("Internal Server Error", { status: 500 })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(500)
      expect(result.error.message).toBe("Internal Server Error")
    }
  })

  it("returns validation error on schema mismatch", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, () => {
        return HttpResponse.json({ unexpectedField: true })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(0)
      expect(result.error.message).toBe("Response validation failed")
      expect(result.error.reason).toBeDefined()
    }
  })

  it("returns abort error on request abort", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return HttpResponse.json({ id: 123 })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const controller = new AbortController()

    setTimeout(() => controller.abort(), 10)

    const result = await fetcher.get("/api/test", schema, { signal: controller.signal })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(0)
      expect(result.error.message).toBe("Request aborted")
      expect(result.error.aborted).toBe(true)
    }
  })

  it("handles already aborted signal", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, async () => {
        return HttpResponse.json({ id: 123 })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const controller = new AbortController()
    controller.abort()

    const result = await fetcher.get("/api/test", schema, { signal: controller.signal })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.aborted).toBe(true)
    }
  })

  it("returns network error on fetch failure", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, () => {
        return HttpResponse.error()
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(0)
      expect(result.error.reason).toBeDefined()
    }
  })

  it("times out when request takes too long", async () => {
    server.use(
      http.get(`${BASE_URL}/api/test`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({ id: 123 })
      }),
    )

    const fetcher = createFetcher({ timeout: 50 })
    const schema = z.object({ id: z.number() })
    const result = await fetcher.get("/api/test", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.aborted).toBe(true)
    }
  })
})

describe("fetcher.post", () => {
  it("sends JSON body and returns parsed response", async () => {
    let capturedBody: unknown
    server.use(
      http.post(`${BASE_URL}/api/create`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 456, success: true })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number(), success: z.boolean() })
    const result = await fetcher.post("/api/create", { name: "new item" }, schema)

    expect(capturedBody).toEqual({ name: "new item" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(456)
      expect(result.data.success).toBe(true)
    }
  })

  it("handles HTTP error in POST", async () => {
    server.use(
      http.post(`${BASE_URL}/api/create`, () => {
        return HttpResponse.json({ error: "Bad Request" }, { status: 400 })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ id: z.number() })
    const result = await fetcher.post("/api/create", {}, schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(400)
      expect(result.error.message).toBe("Bad Request")
    }
  })
})

describe("fetcher.delete", () => {
  it("sends DELETE request and returns parsed response", async () => {
    server.use(
      http.delete(`${BASE_URL}/api/items/123`, () => {
        return HttpResponse.json({ deleted: true })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ deleted: z.boolean() })
    const result = await fetcher.delete("/api/items/123", schema)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.deleted).toBe(true)
    }
  })

  it("handles HTTP error in DELETE", async () => {
    server.use(
      http.delete(`${BASE_URL}/api/items/999`, () => {
        return HttpResponse.json({ error: "Not Found" }, { status: 404 })
      }),
    )

    const fetcher = createFetcher()
    const schema = z.object({ deleted: z.boolean() })
    const result = await fetcher.delete("/api/items/999", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(404)
    }
  })
})

describe("fetcher.getBlob", () => {
  it("returns blob on success", async () => {
    const blobData = new Uint8Array([1, 2, 3, 4, 5])
    server.use(
      http.get(`${BASE_URL}/api/download`, () => {
        return new HttpResponse(blobData, {
          headers: { "Content-Type": "application/octet-stream" },
        })
      }),
    )

    const fetcher = createFetcher()
    const result = await fetcher.getBlob("/api/download")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBeInstanceOf(Blob)
      const buffer = await result.data.arrayBuffer()
      expect(new Uint8Array(buffer)).toEqual(blobData)
    }
  })

  it("returns error on HTTP error", async () => {
    server.use(
      http.get(`${BASE_URL}/api/download`, () => {
        return HttpResponse.json({ error: "Not Found" }, { status: 404 })
      }),
    )

    const fetcher = createFetcher()
    const result = await fetcher.getBlob("/api/download")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(404)
    }
  })

  it("returns error on HTTP error without JSON body", async () => {
    server.use(
      http.get(`${BASE_URL}/api/download`, () => {
        return new HttpResponse("Server Error", { status: 500 })
      }),
    )

    const fetcher = createFetcher()
    const result = await fetcher.getBlob("/api/download")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(500)
    }
  })

  it("returns abort error on request abort", async () => {
    server.use(
      http.get(`${BASE_URL}/api/download`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return new HttpResponse(new Uint8Array([1, 2, 3]))
      }),
    )

    const fetcher = createFetcher()
    const controller = new AbortController()

    setTimeout(() => controller.abort(), 10)

    const result = await fetcher.getBlob("/api/download", { signal: controller.signal })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.aborted).toBe(true)
    }
  })

  it("returns network error on fetch failure", async () => {
    server.use(
      http.get(`${BASE_URL}/api/download`, () => {
        return HttpResponse.error()
      }),
    )

    const fetcher = createFetcher()
    const result = await fetcher.getBlob("/api/download")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(0)
    }
  })
})
