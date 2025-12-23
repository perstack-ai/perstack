import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@perstack/filesystem-storage", () => ({
  FileSystemStorage: vi.fn().mockImplementation(() => ({
    getAllJobs: vi.fn(),
    retrieveJob: vi.fn(),
    getCheckpointsByJobId: vi.fn(),
    retrieveCheckpoint: vi.fn(),
    getEventContents: vi.fn(),
    getAllRuns: vi.fn(),
  })),
}))

describe("logCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exports logCommand", async () => {
    const { logCommand } = await import("./log.js")
    expect(logCommand).toBeDefined()
    expect(logCommand.name()).toBe("log")
  })

  it("has required options", async () => {
    const { logCommand } = await import("./log.js")
    const options = logCommand.options.map((o) => o.long)
    expect(options).toContain("--job")
    expect(options).toContain("--run")
    expect(options).toContain("--checkpoint")
    expect(options).toContain("--step")
    expect(options).toContain("--type")
    expect(options).toContain("--errors")
    expect(options).toContain("--tools")
    expect(options).toContain("--delegations")
    expect(options).toContain("--filter")
    expect(options).toContain("--json")
    expect(options).toContain("--pretty")
    expect(options).toContain("--verbose")
    expect(options).toContain("--take")
    expect(options).toContain("--offset")
    expect(options).toContain("--context")
    expect(options).toContain("--messages")
    expect(options).toContain("--summary")
  })

  it("has correct description", async () => {
    const { logCommand } = await import("./log.js")
    expect(logCommand.description()).toBe("View execution history and events for debugging")
  })

  it("validates --take option rejects non-numeric values", async () => {
    const { logCommand } = await import("./log.js")
    const takeOption = logCommand.options.find((o) => o.long === "--take")
    expect(takeOption).toBeDefined()
    // The parseArg function should throw for non-numeric values
    expect(() => takeOption!.parseArg!("abc", undefined)).toThrow(
      'Invalid value for --take: "abc" is not a valid number',
    )
  })

  it("validates --take option rejects negative values", async () => {
    const { logCommand } = await import("./log.js")
    const takeOption = logCommand.options.find((o) => o.long === "--take")
    expect(takeOption).toBeDefined()
    expect(() => takeOption!.parseArg!("-5", undefined)).toThrow(
      'Invalid value for --take: "-5" must be non-negative',
    )
  })

  it("validates --offset option rejects non-numeric values", async () => {
    const { logCommand } = await import("./log.js")
    const offsetOption = logCommand.options.find((o) => o.long === "--offset")
    expect(offsetOption).toBeDefined()
    expect(() => offsetOption!.parseArg!("xyz", undefined)).toThrow(
      'Invalid value for --offset: "xyz" is not a valid number',
    )
  })

  it("validates --context option rejects non-numeric values", async () => {
    const { logCommand } = await import("./log.js")
    const contextOption = logCommand.options.find((o) => o.long === "--context")
    expect(contextOption).toBeDefined()
    expect(() => contextOption!.parseArg!("foo", undefined)).toThrow(
      'Invalid value for --context: "foo" is not a valid number',
    )
  })
})
