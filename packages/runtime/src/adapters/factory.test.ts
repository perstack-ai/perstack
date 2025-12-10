import { describe, expect, it } from "vitest"
import {
  getAdapter,
  getRegisteredRuntimes,
  isAdapterAvailable,
  registerAdapter,
} from "./factory.js"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("@perstack/runtime: adapter factory", () => {
  describe("getAdapter", () => {
    it("returns PerstackAdapter for perstack", () => {
      const adapter = getAdapter("perstack")
      expect(adapter).toBeInstanceOf(PerstackAdapter)
      expect(adapter.name).toBe("perstack")
    })

    it("throws for unregistered runtime", () => {
      expect(() => getAdapter("cursor")).toThrow('Runtime "cursor" is not registered')
    })
  })

  describe("isAdapterAvailable", () => {
    it("returns true for perstack", () => {
      expect(isAdapterAvailable("perstack")).toBe(true)
    })

    it("returns false for unregistered runtimes", () => {
      expect(isAdapterAvailable("cursor")).toBe(false)
    })
  })

  describe("registerAdapter", () => {
    it("registers a new adapter", () => {
      const mockAdapter = {
        name: "cursor",
        checkPrerequisites: async () => ({ ok: true as const }),
        convertExpert: (expert: { instruction: string }) => ({ instruction: expert.instruction }),
        run: async () => ({ checkpoint: {} as never, events: [] }),
      }
      registerAdapter("cursor", () => mockAdapter)
      expect(isAdapterAvailable("cursor")).toBe(true)
      const adapter = getAdapter("cursor")
      expect(adapter.name).toBe("cursor")
    })
  })

  describe("getRegisteredRuntimes", () => {
    it("returns list of registered runtimes", () => {
      const runtimes = getRegisteredRuntimes()
      expect(runtimes).toContain("perstack")
    })
  })
})
