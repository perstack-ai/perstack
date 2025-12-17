import { describe, expect, it, vi } from "vitest"
import {
  getAdapter,
  getRegisteredRuntimes,
  isAdapterAvailable,
  registerAdapter,
} from "./registry.js"
import type { RuntimeAdapter } from "./types.js"

function createMockAdapter(name: string): RuntimeAdapter {
  return {
    name,
    checkPrerequisites: vi.fn().mockResolvedValue({ ok: true }),
    convertExpert: vi.fn().mockReturnValue({ instruction: "" }),
    run: vi.fn().mockResolvedValue({ checkpoint: {}, events: [] }),
  }
}

describe("@perstack/core: adapter registry", () => {
  describe("registerAdapter and getAdapter", () => {
    it("registers and retrieves an adapter", () => {
      const mockAdapter = createMockAdapter("test-adapter")
      registerAdapter("local", () => mockAdapter)
      const result = getAdapter("local")
      expect(result).toBe(mockAdapter)
    })
  })

  describe("getAdapter", () => {
    it("throws error for unregistered runtime", () => {
      expect(() => getAdapter("unknown-runtime" as "local")).toThrow(
        'Runtime "unknown-runtime" is not registered',
      )
    })
  })

  describe("isAdapterAvailable", () => {
    it("returns true for registered adapter", () => {
      registerAdapter("cursor", () => createMockAdapter("cursor"))
      expect(isAdapterAvailable("cursor")).toBe(true)
    })

    it("returns false for unregistered adapter", () => {
      expect(isAdapterAvailable("unknown" as "local")).toBe(false)
    })
  })

  describe("getRegisteredRuntimes", () => {
    it("returns registered runtime names", () => {
      registerAdapter("gemini", () => createMockAdapter("gemini"))
      const runtimes = getRegisteredRuntimes()
      expect(runtimes).toContain("gemini")
    })
  })
})
