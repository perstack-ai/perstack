export const createErrorHandler =
  (onError?: (error: Error) => void) =>
  (error: unknown, context: string): void => {
    const err = error instanceof Error ? error : new Error(`${context}: ${String(error)}`)
    onError?.(err)
  }
