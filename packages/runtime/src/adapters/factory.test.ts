import { describe, expect, it } from "vitest"
import { getAdapter, isAdapterAvailable } from "./factory.js"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("@perstack/runtime: adapter factory", () => {
  describe("getAdapter", () => {
    it("returns PerstackAdapter for perstack", () => {
      const adapter = getAdapter("perstack")
      expect(adapter).toBeInstanceOf(PerstackAdapter)
      expect(adapter.name).toBe("perstack")
    })

    it("throws for unsupported runtime", () => {
      expect(() => getAdapter("cursor")).toThrow("not supported")
    })
  })

  describe("isAdapterAvailable", () => {
    it("returns true for perstack", () => {
      expect(isAdapterAvailable("perstack")).toBe(true)
    })

    it("returns false for unimplemented runtime", () => {
      expect(isAdapterAvailable("cursor")).toBe(false)
    })
  })
})
