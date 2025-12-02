import { HttpResponse, http, type JsonBodyType } from "msw"
import { setupServer } from "msw/node"

class MockAPI {
  private server: ReturnType<typeof setupServer>
  private baseURL: string

  constructor(baseURL = "https://mock") {
    this.baseURL = baseURL
    this.server = setupServer()
  }

  start() {
    this.server.listen({ onUnhandledRequest: "bypass" })
  }

  stop() {
    this.server.close()
  }

  reset() {
    this.server.resetHandlers()
  }

  // チェーンできるAPI
  get(path: string, response: JsonBodyType, status = 200) {
    this.server.use(
      http.get(`${this.baseURL}${path}`, () => {
        return HttpResponse.json(response, { status })
      }),
    )
    return this
  }

  getBlob(
    path: string,
    response: Blob,
    status = 200,
    filename = "test.txt",
    contentType = "text/plain",
  ) {
    this.server.use(
      http.get(`${this.baseURL}${path}`, () => {
        return new HttpResponse(response, {
          status,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      }),
    )
    return this
  }

  post(path: string, response: JsonBodyType, status = 201) {
    this.server.use(
      http.post(`${this.baseURL}${path}`, () => {
        return HttpResponse.json(response, { status })
      }),
    )
    return this
  }

  delete(path: string, response: JsonBodyType, status = 200) {
    this.server.use(
      http.delete(`${this.baseURL}${path}`, () => {
        return HttpResponse.json(response, { status })
      }),
    )
    return this
  }

  error(path: string, status = 500, message = "Server Error") {
    this.server.use(
      http.all(`${this.baseURL}${path}`, () => {
        return HttpResponse.json({ error: message }, { status })
      }),
    )
    return this
  }

  delay(path: string, ms: number, response: JsonBodyType) {
    this.server.use(
      http.get(`${this.baseURL}${path}`, async () => {
        await new Promise((r) => setTimeout(r, ms))
        return HttpResponse.json(response)
      }),
    )
    return this
  }
}

export const api = new MockAPI()
