import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  checkpointSchema,
  type RunParamsInput,
  type RunSetting,
  runParamsSchema,
  type Step,
  stepSchema,
} from "@perstack/core"
import { createEmptyUsage } from "../src/usage.js"

export function createRunSetting(overrides: Partial<RunParamsInput["setting"]> = {}): RunSetting {
  return runParamsSchema.shape.setting.parse({
    providerConfig: {
      providerName: "anthropic",
      apiKey: "test-provider-api-key",
    },
    model: "claude-sonnet-4-20250514",
    expertKey: "test-expert",
    temperature: 0.3,
    maxRetries: 3,
    maxSteps: 10,
    timeout: 1000,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    input: { text: "Delegate to another expert" },
    experts: {
      "test-expert": {
        key: "test-expert",
        name: "test-expert",
        version: "1.0.0",
        instruction: "You can delegate tasks to other experts.",
        skills: {},
        delegates: ["@perstack/math-expert"],
        tags: [],
      },
    },
    ...overrides,
  })
}

export function createCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return checkpointSchema.parse({
    id: createId(),
    jobId: createId(),
    runId: createId(),
    status: "proceeding",
    stepNumber: 1,
    messages: [
      {
        id: createId(),
        type: "instructionMessage" as const,
        contents: [
          { id: createId(), type: "textPart" as const, text: "You are a helpful assistant." },
        ],
        cache: true,
      },
    ],
    expert: {
      key: "test-expert",
      name: "test-expert",
      version: "1.0.0",
    },
    usage: createEmptyUsage(),
    contextWindow: 100,
    contextWindowUsage: 0,
    ...overrides,
  })
}

export function createStep(overrides: Partial<Step> = {}): Step {
  return stepSchema.parse({
    stepNumber: 1,
    inputMessages: [],
    newMessages: [],
    usage: createEmptyUsage(),
    startedAt: Date.now(),
    finishedAt: undefined,
    ...overrides,
  })
}
