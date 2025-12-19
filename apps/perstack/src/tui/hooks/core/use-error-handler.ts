import { useMemo } from "react"
import { createErrorHandler } from "../../utils/error-handling.js"

export const useErrorHandler = (onError?: (error: Error) => void) => {
  return useMemo(() => createErrorHandler(onError), [onError])
}
