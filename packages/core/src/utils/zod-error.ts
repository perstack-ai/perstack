import { type ZodSchema, ZodError } from "zod"

export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
    return `  - ${path}${issue.message}`
  })
  return `Validation failed:\n${issues.join("\n")}`
}

export function parseWithFriendlyError<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }
  const prefix = context ? `${context}: ` : ""
  throw new Error(`${prefix}${formatZodError(result.error)}`)
}
