import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  checkpointSchema,
  type RunEvent,
  type RunParamsInput,
  type RunSetting,
  type RuntimeEvent,
  runParamsSchema,
  type Step,
  stepSchema,
} from "@perstack/core"
import { createEmptyUsage } from "../src/helpers/usage.js"
import type { LLMExecutor } from "../src/llm/index.js"
import { createMockLLMExecutor } from "../src/llm/index.js"
import type { BaseSkillManager } from "../src/skill-manager/index.js"
import type { RunSnapshot } from "../src/state-machine/machine.js"

export function createRunSetting(overrides: Partial<RunParamsInput["setting"]> = {}): RunSetting {
  return runParamsSchema.shape.setting.parse({
    providerConfig: {
      providerName: "anthropic",
      apiKey: "test-provider-api-key",
    },
    model: "claude-sonnet-4-20250514",
    expertKey: "test-expert",
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
    action: { type: "init" },
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

export interface CreateTestContextOptions {
  setting?: Partial<RunParamsInput["setting"]>
  checkpoint?: Partial<Checkpoint>
  step?: Partial<Step>
  eventListener?: (event: RunEvent | RuntimeEvent) => Promise<void>
  skillManagers?: Record<string, BaseSkillManager>
  llmExecutor?: LLMExecutor
}

export function createTestContext(options: CreateTestContextOptions = {}): RunSnapshot["context"] {
  return {
    setting: createRunSetting(options.setting),
    checkpoint: createCheckpoint(options.checkpoint),
    step: createStep(options.step),
    eventListener: options.eventListener ?? (async () => {}),
    skillManagers: options.skillManagers ?? {},
    llmExecutor: options.llmExecutor ?? (createMockLLMExecutor() as unknown as LLMExecutor),
  }
}
