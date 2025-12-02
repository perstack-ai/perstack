import { describe, expect, it } from "vitest"
import { healthCheck } from "./health-check.js"

describe("@perstack/base: healthCheck", () => {
  it("returns health status", async () => {
    const result = await healthCheck()
    expect(result.status).toBe("ok")
    expect(result.workspace).toBeDefined()
    expect(result.uptime).toMatch(/^\d+s$/)
    expect(result.memory.heapUsed).toMatch(/^\d+MB$/)
    expect(result.memory.heapTotal).toMatch(/^\d+MB$/)
    expect(typeof result.pid).toBe("number")
  })
})
