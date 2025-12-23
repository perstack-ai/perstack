import { HttpResponse, http, type JsonBodyType } from "msw"

const BASE_URL = "https://api.perstack.ai"

export function overrideHandler<T extends JsonBodyType>(
  method: "get" | "post" | "delete" | "put" | "patch",
  urlPath: string,
  response: T,
  status = 200,
) {
  const url = `${BASE_URL}${urlPath}`
  return http[method](url, () => HttpResponse.json(response, { status }))
}

export function overrideErrorHandler(
  method: "get" | "post" | "delete" | "put" | "patch",
  urlPath: string,
  error: { code: number; error: string; reason?: string },
) {
  const url = `${BASE_URL}${urlPath}`
  return http[method](url, () => HttpResponse.json(error, { status: error.code }))
}
