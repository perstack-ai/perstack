import { describe, expect, it } from "vitest"
import { DefaultTransportFactory, defaultTransportFactory } from "./transport-factory.js"

describe("@perstack/runtime: DefaultTransportFactory", () => {
  describe("createStdio", () => {
    it("creates StdioClientTransport with correct options", () => {
      const factory = new DefaultTransportFactory()
      const options = {
        command: "npx",
        args: ["-y", "@example/pkg"],
        env: { PATH: "/usr/bin" },
        stderr: "pipe" as const,
      }

      const transport = factory.createStdio(options)

      expect(transport).toBeDefined()
      // StdioClientTransport stores options internally
      expect(typeof transport.start).toBe("function")
      expect(typeof transport.close).toBe("function")
    })

    it("returns transport with start and close methods", () => {
      const factory = new DefaultTransportFactory()
      const transport = factory.createStdio({
        command: "node",
        args: ["script.js"],
        env: {},
      })

      expect(transport).toHaveProperty("start")
      expect(transport).toHaveProperty("close")
    })
  })

  describe("createSse", () => {
    it("creates SSEClientTransport", () => {
      const factory = new DefaultTransportFactory()
      const url = new URL("https://api.example.com/sse")

      const transport = factory.createSse({ url })

      expect(transport).toBeDefined()
      expect(typeof transport.start).toBe("function")
      expect(typeof transport.close).toBe("function")
    })
  })
})

describe("@perstack/runtime: defaultTransportFactory", () => {
  it("is an instance of DefaultTransportFactory", () => {
    expect(defaultTransportFactory).toBeInstanceOf(DefaultTransportFactory)
  })

  it("has createStdio method", () => {
    expect(typeof defaultTransportFactory.createStdio).toBe("function")
  })

  it("has createSse method", () => {
    expect(typeof defaultTransportFactory.createSse).toBe("function")
  })
})
