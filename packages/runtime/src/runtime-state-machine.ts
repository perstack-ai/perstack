import type { Checkpoint, RunEvent, RunSetting, Step } from "@perstack/core"
import { type ActorRefFrom, assign, type SnapshotFrom, setup } from "xstate"
import { calculateContextWindowUsage } from "./model.js"
import type { BaseSkillManager } from "./skill-manager/index.js"
import { callingDelegateLogic } from "./states/calling-delegate.js"
import { callingInteractiveToolLogic } from "./states/calling-interactive-tool.js"
import { callingToolLogic } from "./states/calling-tool.js"
import { finishingStepLogic } from "./states/finishing-step.js"
import { generatingRunResultLogic } from "./states/generating-run-result.js"
import { generatingToolCallLogic } from "./states/generating-tool-call.js"
import { initLogic } from "./states/init.js"
import { preparingForStepLogic } from "./states/preparing-for-step.js"
import { resolvingImageFileLogic } from "./states/resolving-image-file.js"
import { resolvingPdfFileLogic } from "./states/resolving-pdf-file.js"
import { resolvingThoughtLogic } from "./states/resolving-thought.js"
import { resolvingToolResultLogic } from "./states/resolving-tool-result.js"
import { createEmptyUsage, sumUsage } from "./usage.js"

export const runtimeStateMachine = setup({
  types: {
    input: {} as {
      setting: RunSetting
      initialCheckpoint: Checkpoint
      eventListener: (event: RunEvent) => Promise<void>
      skillManagers: Record<string, BaseSkillManager>
    },
    context: {} as {
      setting: RunSetting
      step: Step
      checkpoint: Checkpoint
      eventListener: (event: RunEvent) => Promise<void>
      skillManagers: Record<string, BaseSkillManager>
    },
    events: {} as RunEvent,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCUCuA7AdASXQSwBcBiWAgQwCcC10BtABgF1FQAHAe1kL3fRZAAeiAKz0AzJgDsAJgAsksZNlixs+gDZZAGhABPRIszCAjGIAcY4crPHhJyQF8HOmpgAKFMK0p50UAGLsFADKBF4k5FQA4mDoYBRkBDx0TPwcXEm8-EIIZmaymPRK8saSopL00tI6+gjq9JjSltLG9HnqZkqdTi4YmDFxCUl+ACrs7AA2AMJkExNEngQUugzMSCDp3FnrOcam0pgAnHbS9GeSZsIq6jWIh2KHUsYd9MbSwl2S6j0grgPxiV8UDGkxmcyIAGNZhMQRNVmlOFs+DtEPt1Jg3odpGVbFcrLcENIzOjbGYipIZMpnmYfn9YgDhsDxtNoZDobgwgkIUkAG5gWHw9abTLI0C7ImSTDqYTY2S45TCCwE54HUr1WRXSqHcRVWl9f5DIGwsHzKFzAAiYAmYCgiTAgrYiJF2VRYnoj1ehwskkOZTEz2EBMMJnMFnezxUF2+zl+fRNRuZCzgkz5sOQcFQEwIDo2TuSLoQpWJUvowl9Flk0sqBLlZik2Mkpjyan90d6WHjo0TnlgKf5AAt2KgoP3s6khXntmLUT6JL6PkoFJX1MZtHoRKIpdrK3sqorpG3Yx3oQnJknexM+W4IAAzfx4a054X5lGFn2PMTYlSyWQH32WAl1DKKV1Q6L1V1EWQ9WPOZT3mHs+2wABbMgYHvR9x0dDIX2nN8zEeOVjGORsmgsMQCTJYRMGJORwP9MwDxpGNXE7Jkz0SMIkNYAgpnYLjrRFJ9J1FQQZzJTBPxUfDDjlN1OgJIkSUVUtDlXCpsUPVx0wvHk4O0zNiBvXw8FgftjWhITsKnUTCU-SU92JMlfSaGtjDrGQKSbfJxGeaDMG0lMjUHYdRyIIz8FM8y5kspECyabFGneRz3RkN011qOwGnUbcVzeJKDz8gLLyBa87wfMAwuMyLmRNGLnVfeL7KSl5nPI9c6mA9RQPwmwNVLQrk2KvxkNQsB0Iq8KTLMmqLMw3MrJEnJGsSxUWtSgkfSU-JDmIqNKj8g1AT8Gh9KzSE+NYASwBoOqcJs+K61sDo5SKBifwU4tSRUtTKi+KDmLjE9hvQTkyG5PBU0TUh2FYGgACFdA5AFwchyZbus3YyklYRst-DUlDEaU2tqFUMS+NyPmlPZDiAvzWMta1bTCCIYfh3QGZtO10cWmcLiOQnG3qHHiSDbGvM-Ex1EjYk-PvCL+yBUJwghXhhlQfl2AAOTAAQCCV1hubiqxjCMRUZXMGSvVUZV6A1LcuorDp8I0WWqoVvx9ZZ2GMARgBRAQITASBIAAWTIAR9dgQ2Gs0Ki8nyK4bCuDVRZNzRwxse4GK6pwY3QdgIDgfgaARBaCxUBosU0cw5TLUiCQAWlkR4nPdbVCeyld-vbHB8AIUvYtfRQ6yr6xa6xcwCTLaiadj1dKxk1phD8jwvB8PxAhCMJWAH+rcKAyuyVaa5Wi+KeW9njV59xpeDvpQ0u1BaFd7u3Y2keDpO7LW2FDLc+Z6AnsPEO4ZYAxghMOCL8MaojsJKYi8cHZ5C9EGNoRg1CdH3GcZeYD-KDV0o-CYp1+4TjLg1cQkp-SfjDE9Ew1R2o-hNnsUs1MfR-UuANHSQUhwjmIVhQeuFTg-ilF8GUblTgKDoRlBQhQJEaiJMnfCHDAp+FKuNKBPNCSlgaOIeQttWxS0DO1bKdY9HvH9D+FotMcFFXwVAEaaFyrqLirbBo1M7KvFUDJCiRJGgalUM3LEMk5R30GEdKAJ0MxZicWQlQEklAyillWVoZgUF1isG0MoDEsF0yBnYkGyNeQa0mNE3CtgiIYnEEBToFwvS+mVPkU20l8JWG1OIHJsE-AcyZmAEpNlbBqEwLo7yVRbY3HatPfCXUOgfCsGSTQmk+hyymorbevSloykeFYCkrxfqrmJiIaRRQ7JbP8Q8PyoQYasEgGsxA2JWiNB-jjdQTRqb1IkP6OwRF8KMSAbnBwQA */
  id: "Run",
  initial: "Init",
  context: ({ input }) => ({
    setting: input.setting,
    checkpoint: input.initialCheckpoint,
    step: {
      stepNumber: input.initialCheckpoint.stepNumber,
      inputMessages: [],
      newMessages: [],
      usage: createEmptyUsage(),
      startedAt: Date.now(),
    },
    eventListener: input.eventListener,
    skillManagers: input.skillManagers,
  }),
  states: {
    Init: {
      on: {
        startRun: {
          target: "PreparingForStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                status: "proceeding",
                messages: [...context.checkpoint.messages, ...event.inputMessages],
                pendingToolCalls: event.initialCheckpoint.pendingToolCalls,
                partialToolResults: event.initialCheckpoint.partialToolResults,
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                inputMessages: event.inputMessages,
              }) satisfies Step,
          }),
        },
      },
    },

    PreparingForStep: {
      on: {
        startGeneration: {
          target: "GeneratingToolCall",
          actions: assign({
            step: ({ context, event }) =>
              ({
                stepNumber: context.checkpoint.stepNumber,
                inputMessages: context.step.inputMessages ?? [],
                newMessages: [],
                usage: createEmptyUsage(),
                startedAt: event.timestamp,
              }) satisfies Step,
          }),
        },
        resumeToolCalls: {
          target: "CallingTool",
          actions: assign({
            step: ({ context, event }) =>
              ({
                stepNumber: context.checkpoint.stepNumber,
                inputMessages: context.step.inputMessages ?? [],
                newMessages: context.step.newMessages,
                toolCalls: context.step.toolCalls,
                toolResults: event.partialToolResults,
                pendingToolCalls: event.pendingToolCalls,
                usage: context.step.usage,
                startedAt: context.step.startedAt,
              }) satisfies Step,
          }),
        },
        finishAllToolCalls: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
                pendingToolCalls: undefined,
                partialToolResults: undefined,
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [...context.step.newMessages, ...event.newMessages],
                pendingToolCalls: undefined,
              }) satisfies Step,
          }),
        },
      },
    },

    GeneratingToolCall: {
      on: {
        retry: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
                usage: sumUsage(context.checkpoint.usage, event.usage),
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: event.newMessages,
                toolCalls: event.toolCalls,
                toolResults: event.toolResults,
                usage: sumUsage(context.step.usage, event.usage),
              }) satisfies Step,
          }),
        },
        callTools: {
          target: "CallingTool",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, event.newMessage],
                usage: sumUsage(context.checkpoint.usage, event.usage),
                contextWindowUsage: context.checkpoint.contextWindow
                  ? calculateContextWindowUsage(event.usage, context.checkpoint.contextWindow)
                  : undefined,
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [event.newMessage],
                toolCalls: event.toolCalls,
                usage: sumUsage(context.step.usage, event.usage),
              }) satisfies Step,
          }),
        },
        callInteractiveTool: {
          target: "CallingInteractiveTool",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, event.newMessage],
                usage: sumUsage(context.checkpoint.usage, event.usage),
                contextWindowUsage: context.checkpoint.contextWindow
                  ? calculateContextWindowUsage(event.usage, context.checkpoint.contextWindow)
                  : undefined,
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [event.newMessage],
                toolCalls: [event.toolCall],
                usage: sumUsage(context.step.usage, event.usage),
              }) satisfies Step,
          }),
        },
        callDelegate: {
          target: "CallingDelegate",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, event.newMessage],
                usage: sumUsage(context.checkpoint.usage, event.usage),
                contextWindowUsage: context.checkpoint.contextWindow
                  ? calculateContextWindowUsage(event.usage, context.checkpoint.contextWindow)
                  : undefined,
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [event.newMessage],
                toolCalls: [event.toolCall],
                usage: sumUsage(context.step.usage, event.usage),
              }) satisfies Step,
          }),
        },
      },
    },

    CallingTool: {
      on: {
        resolveToolResults: {
          target: "ResolvingToolResult",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolResults: event.toolResults,
                pendingToolCalls: undefined,
              }) satisfies Step,
          }),
        },
        resolveThought: {
          target: "ResolvingThought",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolResults: [event.toolResult],
              }) satisfies Step,
          }),
        },
        resolvePdfFile: {
          target: "ResolvingPdfFile",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolResults: [event.toolResult],
              }) satisfies Step,
          }),
        },
        resolveImageFile: {
          target: "ResolvingImageFile",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolResults: [event.toolResult],
              }) satisfies Step,
          }),
        },
        attemptCompletion: {
          target: "GeneratingRunResult",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolResults: [event.toolResult],
              }) satisfies Step,
          }),
        },
        callDelegate: {
          target: "CallingDelegate",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolCalls: context.step.toolCalls,
                toolResults: context.step.toolResults,
                pendingToolCalls: context.step.pendingToolCalls,
              }) satisfies Step,
          }),
        },
        callInteractiveTool: {
          target: "CallingInteractiveTool",
          actions: assign({
            step: ({ context, event }) =>
              ({
                ...context.step,
                toolCalls: context.step.toolCalls,
                toolResults: context.step.toolResults,
                pendingToolCalls: context.step.pendingToolCalls,
              }) satisfies Step,
          }),
        },
      },
    },

    ResolvingToolResult: {
      on: {
        finishToolCall: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [...context.step.newMessages, ...event.newMessages],
              }) satisfies Step,
          }),
        },
      },
    },

    ResolvingThought: {
      on: {
        finishToolCall: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [...context.step.newMessages, ...event.newMessages],
              }) satisfies Step,
          }),
        },
      },
    },

    ResolvingPdfFile: {
      on: {
        finishToolCall: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [...context.step.newMessages, ...event.newMessages],
              }) satisfies Step,
          }),
        },
      },
    },

    ResolvingImageFile: {
      on: {
        finishToolCall: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: [...context.step.newMessages, ...event.newMessages],
              }) satisfies Step,
          }),
        },
      },
    },

    GeneratingRunResult: {
      on: {
        retry: {
          target: "FinishingStep",
          actions: assign({
            checkpoint: ({ context, event }) =>
              ({
                ...context.checkpoint,
                messages: [...context.checkpoint.messages, ...event.newMessages],
                usage: sumUsage(context.checkpoint.usage, event.usage),
              }) satisfies Checkpoint,
            step: ({ context, event }) =>
              ({
                ...context.step,
                newMessages: event.newMessages,
                toolCalls: event.toolCalls,
                toolResults: event.toolResults,
                usage: sumUsage(context.step.usage, event.usage),
              }) satisfies Step,
          }),
        },
        completeRun: {
          target: "Stopped",
          actions: assign({
            checkpoint: ({ event }) => event.checkpoint,
            step: ({ event }) => ({
              ...event.step,
              inputMessages: undefined,
            }),
          }),
        },
      },
    },

    CallingInteractiveTool: {
      on: {
        stopRunByInteractiveTool: {
          target: "Stopped",
          actions: assign({
            checkpoint: ({ event }) => event.checkpoint,
            step: ({ event }) => ({
              ...event.step,
              inputMessages: undefined,
            }),
          }),
        },
      },
    },

    CallingDelegate: {
      on: {
        stopRunByDelegate: {
          target: "Stopped",
          actions: assign({
            checkpoint: ({ event }) => event.checkpoint,
            step: ({ event }) => ({
              ...event.step,
              inputMessages: undefined,
            }),
          }),
        },
      },
    },

    FinishingStep: {
      on: {
        continueToNextStep: {
          target: "PreparingForStep",
          actions: assign({
            checkpoint: ({ event }) => event.nextCheckpoint,
            step: ({ event }) => ({
              ...event.step,
              inputMessages: undefined,
            }),
          }),
          reenter: true,
        },
        stopRunByExceededMaxSteps: {
          target: "Stopped",
          actions: assign({
            checkpoint: ({ event }) => event.checkpoint,
            step: ({ event }) => ({
              ...event.step,
              inputMessages: undefined,
            }),
          }),
        },
      },
    },

    Stopped: {
      type: "final",
    },
  },
})

export const StateMachineLogics: Record<
  Exclude<RunSnapshot["value"], "Stopped">,
  (context: RunSnapshot["context"]) => Promise<RunEvent>
> = {
  Init: initLogic,
  PreparingForStep: preparingForStepLogic,
  GeneratingToolCall: generatingToolCallLogic,
  CallingTool: callingToolLogic,
  ResolvingToolResult: resolvingToolResultLogic,
  ResolvingThought: resolvingThoughtLogic,
  ResolvingPdfFile: resolvingPdfFileLogic,
  ResolvingImageFile: resolvingImageFileLogic,
  GeneratingRunResult: generatingRunResultLogic,
  CallingInteractiveTool: callingInteractiveToolLogic,
  CallingDelegate: callingDelegateLogic,
  FinishingStep: finishingStepLogic,
}

export type RunActor = ActorRefFrom<typeof runtimeStateMachine>
export type RunSnapshot = SnapshotFrom<typeof runtimeStateMachine>
