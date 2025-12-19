import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn(),
}))

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}))

vi.mock("commander", async (_importOriginal) => {
  const { vi: vitest } = await import("vitest")
  return {
    Command: class {
      name = vitest.fn().mockReturnThis()
      description = vitest.fn().mockReturnThis()
      version = vitest.fn().mockReturnThis()
      option = vitest.fn().mockReturnThis()
      action = vitest.fn().mockReturnThis()
      parse = vitest.fn()
    },
  }
})

describe("@perstack/base: MCP server entry point", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("server module loads without errors", async () => {
    vi.doMock("../package.json", () => ({
      default: {
        name: "@perstack/base",
        description: "Essential MCP tools package for Perstack agents",
        version: "0.0.10",
      },
    }))
    await expect(import("./server.js")).resolves.toBeDefined()
  })
})
