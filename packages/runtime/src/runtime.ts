import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
  type RunEvent,
  type RunParamsInput,
  type RunSetting,
  type RuntimeEvent,
  runParamsSchema,
  type Step,
} from "@perstack/core"
import { createActor } from "xstate"
import pkg from "../package.json" with { type: "json" }
import {
  defaultRetrieveCheckpoint,
  defaultStoreCheckpoint,
  defaultStoreEvent,
} from "./default-store.js"
import { RunEventEmitter } from "./events/event-emitter.js"
import { getContextWindow } from "./model.js"
import { resolveExpertToRun } from "./resolve-expert-to-run.js"
import { runtimeStateMachine, StateMachineLogics } from "./runtime-state-machine.js"
import { closeSkillManagers, getSkillManagers } from "./skill-manager.js"
import { createEmptyUsage } from "./usage.js"

export async function run(
  runInput: RunParamsInput,
  options?: {
    shouldContinueRun?: (
      setting: RunSetting,
      checkpoint: Checkpoint,
      step: Step,
    ) => Promise<boolean>
    retrieveCheckpoint?: (checkpointId: string) => Promise<Checkpoint>
    storeCheckpoint?: (checkpoint: Checkpoint, timestamp: number) => Promise<void>
    eventListener?: (event: RunEvent | RuntimeEvent) => void
  },
): Promise<Checkpoint> {
  const runParams = runParamsSchema.parse(runInput)
  const eventListener = getEventListener(options)
  const retrieveCheckpoint = options?.retrieveCheckpoint ?? defaultRetrieveCheckpoint
  const storeCheckpoint = options?.storeCheckpoint ?? defaultStoreCheckpoint
  const eventEmitter = new RunEventEmitter()
  eventEmitter.subscribe(eventListener)
  let { setting, checkpoint } = runParams
  const contextWindow = getContextWindow(setting.providerConfig.providerName, setting.model)

  if (setting.workspace) {
    if (!path.isAbsolute(setting.workspace)) {
      throw new Error(`Workspace path must be absolute: ${setting.workspace}`)
    }
    process.chdir(setting.workspace)
  }

  await storeRunSetting(setting)
  while (true) {
    const { expertToRun, experts } = await setupExperts(setting)
    if (options?.eventListener) {
      const initEvent = createRuntimeEvent("initializeRuntime", setting.runId, {
        runtimeVersion: pkg.version,
        expertName: expertToRun.name,
        experts: Object.keys(experts),
        model: setting.model,
        temperature: setting.temperature,
        maxSteps: setting.maxSteps,
        maxRetries: setting.maxRetries,
        timeout: setting.timeout,
        query: setting.input.text,
        interactiveToolCall: setting.input.interactiveToolCallResult,
      })
      options.eventListener(initEvent)
    }
    const skillManagers = await getSkillManagers(
      expertToRun,
      experts,
      setting,
      options?.eventListener,
    )
    const runActor = createActor(runtimeStateMachine, {
      input: {
        setting: {
          ...setting,
          experts,
        },
        initialCheckpoint: checkpoint
          ? {
              ...checkpoint,
              id: createId(),
              stepNumber: checkpoint.stepNumber + 1,
            }
          : {
              id: createId(),
              runId: setting.runId,
              expert: {
                key: setting.expertKey,
                name: expertToRun.name,
                version: expertToRun.version,
              },
              stepNumber: 1,
              status: "init",
              messages: [],
              usage: createEmptyUsage(),
              contextWindow,
              contextWindowUsage: contextWindow ? 0.0 : undefined,
            },
        eventListener,
        skillManagers,
      },
    })
    const runResultCheckpoint = await new Promise<Checkpoint>((resolve, reject) => {
      runActor.subscribe(async (runState) => {
        try {
          if (runState.value === "Stopped") {
            const { checkpoint, skillManagers } = runState.context
            if (!checkpoint) {
              throw new Error("Checkpoint is undefined")
            }
            await closeSkillManagers(skillManagers)
            resolve(checkpoint)
          } else {
            const event = await StateMachineLogics[runState.value](runState.context)
            if ("checkpoint" in event) {
              await storeCheckpoint(event.checkpoint, event.timestamp)
            }
            await eventEmitter.emit(event)
            if (options?.shouldContinueRun) {
              const shouldContinue = await options.shouldContinueRun(
                runState.context.setting,
                runState.context.checkpoint,
                runState.context.step,
              )
              if (!shouldContinue) {
                runActor.stop()
                resolve(runState.context.checkpoint)
                return
              }
            }
            runActor.send(event)
          }
        } catch (error) {
          reject(error)
        }
      })
      runActor.start()
    })
    switch (runResultCheckpoint.status) {
      case "completed": {
        if (runResultCheckpoint.delegatedBy) {
          const { messages, delegatedBy } = runResultCheckpoint
          const { expert, toolCallId, toolName, checkpointId } = delegatedBy
          const delegateResultMessage = messages[messages.length - 1]
          if (delegateResultMessage.type !== "expertMessage") {
            throw new Error("Delegation error: delegation result message is incorrect")
          }
          const delegateText = delegateResultMessage.contents.find(
            (content) => content.type === "textPart",
          )
          if (!delegateText) {
            throw new Error("Delegation error: delegation result message does not contain a text")
          }
          setting = {
            ...setting,
            expertKey: expert.key,
            input: {
              interactiveToolCallResult: {
                toolCallId,
                toolName,
                text: delegateText.text,
              },
            },
          }
          checkpoint = {
            ...(await retrieveCheckpoint(setting.runId, checkpointId)),
            stepNumber: runResultCheckpoint.stepNumber,
            usage: runResultCheckpoint.usage,
          }
          break
        }
        return runResultCheckpoint
      }
      case "stoppedByInteractiveTool": {
        return runResultCheckpoint
      }
      case "stoppedByDelegate": {
        if (!runResultCheckpoint.delegateTo) {
          throw new Error("Delegation error: delegate to is undefined")
        }
        const { expert, toolCallId, toolName, query } = runResultCheckpoint.delegateTo
        setting = {
          ...setting,
          expertKey: expert.key,
          input: {
            text: query,
          },
        }
        checkpoint = {
          ...runResultCheckpoint,
          status: "init",
          messages: [],
          expert: {
            key: expert.key,
            name: expert.name,
            version: expert.version,
          },
          delegatedBy: {
            expert: {
              key: expertToRun.key,
              name: expertToRun.name,
              version: expertToRun.version,
            },
            toolCallId,
            toolName,
            checkpointId: runResultCheckpoint.id,
          },
          usage: runResultCheckpoint.usage,
        }
        break
      }
      case "stoppedByExceededMaxSteps": {
        return runResultCheckpoint
      }
      case "stoppedByError": {
        return runResultCheckpoint
      }
      default:
        throw new Error("Run stopped by unknown reason")
    }
  }
}

async function setupExperts(setting: RunSetting) {
  const { expertKey } = setting
  const experts = { ...setting.experts }
  const clientOptions = {
    perstackApiBaseUrl: setting.perstackApiBaseUrl,
    perstackApiKey: setting.perstackApiKey,
  }
  const expertToRun = await resolveExpertToRun(expertKey, experts, clientOptions)
  for (const delegateName of expertToRun.delegates) {
    const delegate = await resolveExpertToRun(delegateName, experts, clientOptions)
    if (!delegate) {
      throw new Error(`Delegate ${delegateName} not found`)
    }
  }
  return { expertToRun, experts }
}

function getEventListener(options?: { eventListener?: (event: RunEvent | RuntimeEvent) => void }) {
  const listener =
    options?.eventListener ?? ((e: RunEvent | RuntimeEvent) => console.log(JSON.stringify(e)))
  return async (event: RunEvent | RuntimeEvent) => {
    if ("stepNumber" in event) {
      await defaultStoreEvent(event)
    }
    listener(event)
  }
}

async function storeRunSetting(setting: RunSetting) {
  const runDir = getRunDir(setting.runId)
  if (existsSync(runDir)) {
    const runSettingPath = path.resolve(runDir, "run-setting.json")
    const runSetting = JSON.parse(await readFile(runSettingPath, "utf-8")) as RunSetting
    runSetting.updatedAt = Date.now()
    await writeFile(runSettingPath, JSON.stringify(runSetting), "utf-8")
  } else {
    await mkdir(runDir, { recursive: true })
    await writeFile(path.resolve(runDir, "run-setting.json"), JSON.stringify(setting), "utf-8")
  }
}

export function getRunDir(runId: string) {
  return `${process.cwd()}/perstack/runs/${runId}`
}
