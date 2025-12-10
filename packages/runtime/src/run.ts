import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
  type DelegationTarget,
  type Expert,
  getAdapter,
  type Job,
  type RunEvent,
  type RunParamsInput,
  type RunSetting,
  type RuntimeEvent,
  type RuntimeName,
  runParamsSchema,
  type Step,
  type ToolResult,
  type Usage,
} from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import { RunEventEmitter } from "./events/event-emitter.js"
import {
  buildDelegateToState,
  buildDelegationReturnState,
  createInitialCheckpoint,
  createNextStepCheckpoint,
  createEmptyUsage,
  getContextWindow,
  type ResolveExpertToRunFn,
  setupExperts,
  sumUsage,
} from "./helpers/index.js"
import { getSkillManagers } from "./skill-manager/index.js"
import { executeStateMachine } from "./state-machine/index.js"
import {
  createInitialJob,
  defaultGetRunDir,
  defaultRetrieveCheckpoint,
  defaultStoreCheckpoint,
  defaultStoreEvent,
  type FileSystem,
  type GetRunDirFn,
  retrieveJob,
  storeJob,
  storeRunSetting,
} from "./storage/index.js"

export async function run(
  runInput: RunParamsInput,
  options?: {
    shouldContinueRun?: (
      setting: RunSetting,
      checkpoint: Checkpoint,
      step: Step,
    ) => Promise<boolean>
    retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
    eventListener?: (event: RunEvent | RuntimeEvent) => void
    resolveExpertToRun?: ResolveExpertToRunFn
    fileSystem?: FileSystem
    getRunDir?: GetRunDirFn
    returnOnDelegationComplete?: boolean
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
  const getRunDir = options?.getRunDir ?? defaultGetRunDir
  await storeRunSetting(setting, options?.fileSystem, getRunDir)
  let job: Job =
    retrieveJob(setting.jobId) ??
    createInitialJob(setting.jobId, setting.expertKey, setting.maxSteps)
  if (job.status !== "running") {
    job = { ...job, status: "running", finishedAt: undefined }
  }
  storeJob(job)
  while (true) {
    const { expertToRun, experts } = await setupExperts(setting, options?.resolveExpertToRun)
    if (options?.eventListener) {
      const initEvent = createRuntimeEvent("initializeRuntime", setting.jobId, setting.runId, {
        runtimeVersion: pkg.version,
        runtime: "perstack",
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
      { isDelegatedRun: !!checkpoint?.delegatedBy },
    )
    const initialCheckpoint = checkpoint
      ? createNextStepCheckpoint(createId(), checkpoint)
      : createInitialCheckpoint(createId(), {
          jobId: setting.jobId,
          runId: setting.runId,
          expertKey: setting.expertKey,
          expert: expertToRun,
          contextWindow,
        })
    const runResultCheckpoint = await executeStateMachine({
      setting: { ...setting, experts },
      initialCheckpoint,
      eventListener,
      skillManagers,
      eventEmitter,
      storeCheckpoint,
      shouldContinueRun: options?.shouldContinueRun,
    })
    job = {
      ...job,
      totalSteps: runResultCheckpoint.stepNumber,
      usage: runResultCheckpoint.usage,
    }
    switch (runResultCheckpoint.status) {
      case "completed": {
        if (options?.returnOnDelegationComplete) {
          storeJob(job)
          return runResultCheckpoint
        }
        if (runResultCheckpoint.delegatedBy) {
          storeJob(job)
          const parentCheckpoint = await retrieveCheckpoint(
            setting.jobId,
            runResultCheckpoint.delegatedBy.checkpointId,
          )
          const result = buildDelegationReturnState(setting, runResultCheckpoint, parentCheckpoint)
          setting = result.setting
          checkpoint = result.checkpoint
          break
        }
        storeJob({ ...job, status: "completed", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      case "stoppedByInteractiveTool": {
        storeJob({ ...job, status: "stoppedByInteractiveTool" })
        return runResultCheckpoint
      }
      case "stoppedByDelegate": {
        storeJob(job)
        const { delegateTo } = runResultCheckpoint
        if (!delegateTo || delegateTo.length === 0) {
          throw new Error("No delegations found in checkpoint")
        }
        const hasNonDefaultRuntime = delegateTo.some(
          (d) =>
            d.runtime &&
            (Array.isArray(d.runtime)
              ? d.runtime.some((r) => r !== "perstack")
              : d.runtime !== "perstack"),
        )
        if (delegateTo.length === 1 && !hasNonDefaultRuntime) {
          const result = buildDelegateToState(setting, runResultCheckpoint, expertToRun)
          setting = result.setting
          checkpoint = result.checkpoint
          break
        }
        const firstDelegation = delegateTo[0]
        const remainingDelegations = delegateTo.slice(1)
        const [firstResult, ...restResults] = await Promise.all(
          delegateTo.map((delegation) =>
            runDelegate(delegation, setting, runResultCheckpoint, expertToRun, options),
          ),
        )
        const allResults = [firstResult, ...restResults]
        const aggregatedUsage = allResults.reduce(
          (acc, result) => sumUsage(acc, result.deltaUsage),
          runResultCheckpoint.usage,
        )
        const maxStepNumber = Math.max(...allResults.map((r) => r.stepNumber))
        const restToolResults: ToolResult[] = restResults.map((result) => ({
          id: result.toolCallId,
          skillName: `delegate/${result.expertKey}`,
          toolName: result.toolName,
          result: [{ type: "textPart", id: createId(), text: result.text }],
        }))
        const processedToolCallIds = new Set(remainingDelegations.map((d) => d.toolCallId))
        const remainingToolCalls = runResultCheckpoint.pendingToolCalls?.filter(
          (tc) => !processedToolCallIds.has(tc.id) && tc.id !== firstDelegation.toolCallId,
        )
        setting = {
          ...setting,
          expertKey: expertToRun.key,
          input: {
            interactiveToolCallResult: {
              toolCallId: firstResult.toolCallId,
              toolName: firstResult.toolName,
              skillName: `delegate/${firstResult.expertKey}`,
              text: firstResult.text,
            },
          },
        }
        checkpoint = {
          ...runResultCheckpoint,
          status: "stoppedByDelegate",
          delegateTo: undefined,
          stepNumber: maxStepNumber,
          usage: aggregatedUsage,
          pendingToolCalls: remainingToolCalls?.length ? remainingToolCalls : undefined,
          partialToolResults: [
            ...(runResultCheckpoint.partialToolResults ?? []),
            ...restToolResults,
          ],
        }
        break
      }
      case "stoppedByExceededMaxSteps": {
        storeJob({ ...job, status: "stoppedByMaxSteps", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      case "stoppedByError": {
        storeJob({ ...job, status: "stoppedByError", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      default:
        throw new Error("Run stopped by unknown reason")
    }
  }
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

type DelegationResult = {
  toolCallId: string
  toolName: string
  expertKey: string
  text: string
  stepNumber: number
  deltaUsage: Usage
}

type RuntimeDelegationResult = DelegationResult & { runtime: RuntimeName }

type DelegateOptions = {
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  resolveExpertToRun?: ResolveExpertToRunFn
  fileSystem?: FileSystem
  getRunDir?: GetRunDirFn
}

async function runDelegate(
  delegation: DelegationTarget,
  parentSetting: RunSetting,
  parentCheckpoint: Checkpoint,
  parentExpert: Pick<Expert, "key" | "name" | "version">,
  options?: DelegateOptions,
): Promise<DelegationResult> {
  const { expert: delegateExpertInfo, toolCallId, toolName, query, runtime } = delegation
  const runtimes: RuntimeName[] = runtime
    ? Array.isArray(runtime)
      ? runtime
      : [runtime]
    : ["perstack"]
  const results = await Promise.all(
    runtimes.map((rt) =>
      runDelegateOnRuntime(delegation, parentSetting, parentCheckpoint, parentExpert, rt, options),
    ),
  )
  const combinedText =
    results.length === 1
      ? results[0].text
      : results.map((r) => `[${r.runtime}]\n${r.text}`).join("\n\n")
  const maxStepNumber = Math.max(...results.map((r) => r.stepNumber))
  const totalUsage = results.reduce((acc, r) => sumUsage(acc, r.deltaUsage), createEmptyUsage())
  return {
    toolCallId,
    toolName,
    expertKey: delegateExpertInfo.key,
    text: combinedText,
    stepNumber: maxStepNumber,
    deltaUsage: totalUsage,
  }
}

async function runDelegateOnRuntime(
  delegation: DelegationTarget,
  parentSetting: RunSetting,
  parentCheckpoint: Checkpoint,
  parentExpert: Pick<Expert, "key" | "name" | "version">,
  runtime: RuntimeName,
  options?: DelegateOptions,
): Promise<RuntimeDelegationResult> {
  const { expert, toolCallId, toolName, query } = delegation
  const delegateRunId = createId()
  if (runtime === "perstack") {
    const delegateSetting: RunSetting = {
      ...parentSetting,
      runId: delegateRunId,
      expertKey: expert.key,
      input: { text: query },
    }
    const delegateCheckpoint: Checkpoint = {
      id: createId(),
      jobId: parentSetting.jobId,
      runId: delegateRunId,
      status: "init",
      stepNumber: parentCheckpoint.stepNumber,
      messages: [],
      expert: {
        key: expert.key,
        name: expert.name,
        version: expert.version,
      },
      delegatedBy: {
        expert: {
          key: parentExpert.key,
          name: parentExpert.name,
          version: parentExpert.version,
        },
        toolCallId,
        toolName,
        checkpointId: parentCheckpoint.id,
      },
      usage: createEmptyUsage(),
      contextWindow: parentCheckpoint.contextWindow,
    }
    const resultCheckpoint = await run(
      { setting: delegateSetting, checkpoint: delegateCheckpoint },
      { ...options, returnOnDelegationComplete: true },
    )
    const lastMessage = resultCheckpoint.messages[resultCheckpoint.messages.length - 1]
    if (!lastMessage || lastMessage.type !== "expertMessage") {
      throw new Error("Delegation error: delegation result message is incorrect")
    }
    const textPart = lastMessage.contents.find((c) => c.type === "textPart")
    if (!textPart || textPart.type !== "textPart") {
      throw new Error("Delegation error: delegation result message does not contain text")
    }
    return {
      toolCallId,
      toolName,
      expertKey: expert.key,
      text: textPart.text,
      stepNumber: resultCheckpoint.stepNumber,
      deltaUsage: resultCheckpoint.usage,
      runtime,
    }
  }
  const adapter = getAdapter(runtime)
  const prereqResult = await adapter.checkPrerequisites()
  if (!prereqResult.ok) {
    throw new Error(`Runtime "${runtime}" prerequisites not met: ${prereqResult.error.message}`)
  }
  const result = await adapter.run({
    setting: {
      ...parentSetting,
      runId: delegateRunId,
      expertKey: expert.key,
      input: { text: query },
    },
    eventListener: options?.eventListener,
    storeCheckpoint: options?.storeCheckpoint,
  })
  const lastMessage = result.checkpoint.messages[result.checkpoint.messages.length - 1]
  const textPart =
    lastMessage?.type === "expertMessage"
      ? lastMessage.contents.find((c) => c.type === "textPart")
      : null
  return {
    toolCallId,
    toolName,
    expertKey: expert.key,
    text: textPart && textPart.type === "textPart" ? textPart.text : "",
    stepNumber: result.checkpoint.stepNumber,
    deltaUsage: result.checkpoint.usage,
    runtime,
  }
}

export { defaultGetRunDir as getRunDir }
