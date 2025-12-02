export class ApiError extends Error {
  constructor(responseText: string) {
    let payload: { code: number; error: string; reason: string } | null = null
    try {
      payload = JSON.parse(responseText)
    } catch {
      /* noop */
    }
    const code = payload?.code ?? 500
    const error = payload?.error ?? "Unknown error"
    const reason = payload?.reason ?? responseText
    super(`${code} ${error}: ${reason}`)
    this.name = new.target.name
    this.code = code
    this.error = error
    this.reason = reason
    Object.setPrototypeOf(this, new.target.prototype)
    if (
      typeof (
        Error as unknown as {
          captureStackTrace: (targetObject: object, constructorOpt?: unknown) => void
        }
      ).captureStackTrace === "function"
    ) {
      ;(
        Error as unknown as {
          captureStackTrace: (targetObject: object, constructorOpt?: unknown) => void
        }
      ).captureStackTrace(this, new.target)
    }
  }

  public readonly code: number
  public readonly error: string
  public readonly reason: string
}
