import { describe, expect, it } from "vitest"
import { createEvent, createRuntimeEvent, parseExpertKey } from "./runtime.js"

describe("@perstack/core: parseExpertKey", () => {
  it("parses simple expert key", () => {
    const result = parseExpertKey("my-expert")
    expect(result.key).toBe("my-expert")
    expect(result.name).toBe("my-expert")
    expect(result.version).toBeUndefined()
    expect(result.tag).toBeUndefined()
  })

  it("parses scoped expert key", () => {
    const result = parseExpertKey("@org/my-expert")
    expect(result.key).toBe("@org/my-expert")
    expect(result.name).toBe("@org/my-expert")
  })

  it("parses expert key with version", () => {
    const result = parseExpertKey("my-expert@1.0.0")
    expect(result.key).toBe("my-expert@1.0.0")
    expect(result.name).toBe("my-expert")
    expect(result.version).toBe("1.0.0")
  })

  it("parses expert key with tag", () => {
    const result = parseExpertKey("my-expert@latest")
    expect(result.key).toBe("my-expert@latest")
    expect(result.name).toBe("my-expert")
    expect(result.tag).toBe("latest")
  })

  it("throws error for invalid expert key", () => {
    expect(() => parseExpertKey("Invalid Key!")).toThrow("Invalid expert key format")
  })

  it("throws error for empty string", () => {
    expect(() => parseExpertKey("")).toThrow("Invalid expert key format")
  })
})

describe("@perstack/core: createEvent", () => {
  const mockSetting = {
    jobId: "job-123",
    runId: "run-123",
    expertKey: "test-expert",
    model: "test-model",
    providerConfig: { providerName: "anthropic" as const, apiKey: "key" },
    input: { text: "test" },
    experts: {},
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    perstackApiBaseUrl: "https://api.perstack.ai",
    env: {},
  }
  const mockCheckpoint = {
    id: "cp-123",
    jobId: "job-123",
    runId: "run-123",
    expert: { key: "test-expert", name: "test-expert", version: "1.0.0" },
    stepNumber: 1,
    status: "proceeding" as const,
    messages: [],
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
  }

  it("creates startRun event", () => {
    const startRun = createEvent("startRun")
    const event = startRun(mockSetting, mockCheckpoint, {
      initialCheckpoint: mockCheckpoint,
      inputMessages: [],
    })
    expect(event.type).toBe("startRun")
    expect(event.jobId).toBe("job-123")
    expect(event.runId).toBe("run-123")
    expect(event.expertKey).toBe("test-expert")
    expect(event.stepNumber).toBe(1)
    expect(event.id).toBeDefined()
    expect(event.timestamp).toBeDefined()
  })
})

describe("@perstack/core: createRuntimeEvent", () => {
  it("creates initializeRuntime event", () => {
    const event = createRuntimeEvent("initializeRuntime", "job-123", "run-123", {
      runtimeVersion: "1.0.0",
      expertName: "test-expert",
      experts: ["expert-1", "expert-2"],
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      maxRetries: 3,
      timeout: 30000,
    })
    expect(event.type).toBe("initializeRuntime")
    expect(event.jobId).toBe("job-123")
    expect(event.runId).toBe("run-123")
    expect(event.runtimeVersion).toBe("1.0.0")
    expect(event.id).toBeDefined()
    expect(event.timestamp).toBeDefined()
  })

  it("creates skillConnected event", () => {
    const event = createRuntimeEvent("skillConnected", "job-456", "run-456", {
      skillName: "@perstack/base",
      serverInfo: { name: "base", version: "1.0.0" },
    })
    expect(event.type).toBe("skillConnected")
    expect(event.jobId).toBe("job-456")
    expect(event.runId).toBe("run-456")
    expect(event.skillName).toBe("@perstack/base")
  })

  it("creates skillDisconnected event", () => {
    const event = createRuntimeEvent("skillDisconnected", "job-789", "run-789", {
      skillName: "@perstack/base",
    })
    expect(event.type).toBe("skillDisconnected")
    expect(event.jobId).toBe("job-789")
    expect(event.skillName).toBe("@perstack/base")
  })
})
