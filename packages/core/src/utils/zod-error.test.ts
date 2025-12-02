import { describe, expect, it } from "vitest"
import { z } from "zod"
import { formatZodError, parseWithFriendlyError } from "./zod-error.js"

describe("@perstack/core: zod-error", () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  })

  describe("formatZodError", () => {
    it("formats single error", () => {
      const result = testSchema.safeParse({ name: "", age: 25 })
      if (result.success) throw new Error("Should fail")
      const formatted = formatZodError(result.error)
      expect(formatted).toContain("Validation failed:")
      expect(formatted).toContain("name:")
    })

    it("formats multiple errors", () => {
      const result = testSchema.safeParse({ name: "", age: -1 })
      if (result.success) throw new Error("Should fail")
      const formatted = formatZodError(result.error)
      expect(formatted).toContain("name:")
      expect(formatted).toContain("age:")
    })
  })

  describe("parseWithFriendlyError", () => {
    it("returns parsed data on success", () => {
      const result = parseWithFriendlyError(testSchema, { name: "test", age: 25 })
      expect(result).toEqual({ name: "test", age: 25 })
    })

    it("throws friendly error on failure", () => {
      expect(() => parseWithFriendlyError(testSchema, { name: "", age: 25 })).toThrow(
        "Validation failed:",
      )
    })

    it("includes context in error message", () => {
      expect(() =>
        parseWithFriendlyError(testSchema, { name: "", age: 25 }, "test config"),
      ).toThrow("test config:")
    })
  })
})
