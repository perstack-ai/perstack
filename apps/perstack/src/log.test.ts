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
    expect(options).toContain("--limit")
    expect(options).toContain("--context")
    expect(options).toContain("--messages")
    expect(options).toContain("--summary")
    expect(options).toContain("--config")
  })

  it("has correct description", async () => {
    const { logCommand } = await import("./log.js")
    expect(logCommand.description()).toBe("View execution history and events for debugging")
  })
})
