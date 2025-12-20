import type { Checkpoint, RunSetting } from "@perstack/core"
import { describe, expect, it } from "vitest"
import type { LLMExecutor } from "../llm/index.js"
import { createMockLLMExecutor } from "../llm/index.js"
import { DefaultActorFactory, defaultActorFactory } from "./actor-factory.js"

describe("@perstack/runtime: DefaultActorFactory", () => {
  it("is an instance of DefaultActorFactory", () => {
    expect(defaultActorFactory).toBeInstanceOf(DefaultActorFactory)
  })

  it("has create method", () => {
    expect(typeof defaultActorFactory.create).toBe("function")
  })

  it("creates an actor with start and stop methods", () => {
    const factory = new DefaultActorFactory()
    const actor = factory.create({
      input: {
        setting: {
          jobId: "test-job",
          runId: "test-run",
          expertKey: "test-expert",
          experts: {},
          input: { text: "test" },
          env: {},
          startedAt: Date.now(),
        } as unknown as RunSetting,
        initialCheckpoint: {
          status: "init",
          stepNumber: 0,
          messages: [],
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            totalTokens: 0,
            cachedInputTokens: 0,
          },
        } as unknown as Checkpoint,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: createMockLLMExecutor() as unknown as LLMExecutor,
      },
    })

    expect(actor).toBeDefined()
    expect(typeof actor.start).toBe("function")
    expect(typeof actor.stop).toBe("function")
    expect(typeof actor.subscribe).toBe("function")
    expect(typeof actor.send).toBe("function")
  })
})
