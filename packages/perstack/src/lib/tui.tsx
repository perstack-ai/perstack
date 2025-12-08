import type { EventForType, RunEvent } from "@perstack/core"

const log = console.info
const debug = console.debug
const header = (e: RunEvent) => {
  const t = new Date().toISOString()
  const stepNumber = e.stepNumber
  const key = e.expertKey
  return `${t} ${stepNumber} ${key}`
}
export function defaultEventListener(e: RunEvent): void {
  switch (e.type) {
    case "startRun": {
      log(`${header(e)} Perstack started`)
      break
    }
    case "startGeneration": {
      log(`${header(e)} Generating tool call`)
      break
    }
    case "retry": {
      log(`${header(e)} Retrying tool call generation`)
      debug(e.reason)
      break
    }
    case "callTools": {
      log(`${header(e)} Calling ${e.toolCalls.length} tool(s)`)
      for (const toolCall of e.toolCalls) {
        if (toolCall.skillName === "@perstack/base") {
          switch (toolCall.toolName) {
          case "think": {
              const thought = toolCall.args.thought
            log(`${header(e)} Thought Updated:`)
            debug(thought)
            break
          }
          case "readPdfFile": {
              const path = toolCall.args.path
            log(`${header(e)} Reading PDF: ${path}`)
            break
          }
          case "readImageFile": {
              const path = toolCall.args.path
            log(`${header(e)} Reading Image: ${path}`)
            break
          }
          default: {
              log(`${header(e)} Tool: ${toolCall.skillName}/${toolCall.toolName}`)
              debug(`${header(e)} Args: ${JSON.stringify(toolCall.args, null, 2)}`)
            break
          }
        }
      } else {
          log(`${header(e)} Tool: ${toolCall.skillName}/${toolCall.toolName}`)
          debug(`${header(e)} Args: ${JSON.stringify(toolCall.args, null, 2)}`)
        }
      }
      break
    }
    case "callInteractiveTool": {
      log(`${header(e)} Calling interactive tool`)
      log(`${header(e)} Tool: ${e.toolCall.skillName}/${e.toolCall.toolName}`)
      debug(`${header(e)} Args: ${JSON.stringify(e.toolCall.args, null, 2)}`)
      break
    }
    case "callDelegate": {
      log(`${header(e)} Calling delegate`)
      log(`${header(e)} Tool: ${e.toolCall.toolName}`)
      debug(`${header(e)} Args: ${JSON.stringify(e.toolCall.args, null, 2)}`)
      break
    }
    case "resolveToolResults": {
      log(`${header(e)} Resolved ${e.toolResults.length} Tool Result(s)`)
      for (const toolResult of e.toolResults) {
        if (toolResult.skillName === "@perstack/base") {
          switch (toolResult.toolName) {
          case "todo": {
              const text = toolResult.result.find((r) => r.type === "textPart")?.text
            const { todos } = JSON.parse(text ?? "{}") as {
              todos: {
                id: number
                title: string
                completed: boolean
              }[]
            }
            log(`${header(e)} Todo:`)
            for (const todo of todos) {
              debug(`${todo.completed ? "[x]" : "[ ]"} ${todo.id}: ${todo.title}`)
            }
            break
          }
          default: {
              log(`${header(e)} Tool: ${toolResult.skillName}/${toolResult.toolName}`)
              debug(`${header(e)} Result: ${JSON.stringify(toolResult.result, null, 2)}`)
            break
          }
        }
      } else {
          log(`${header(e)} Tool: ${toolResult.skillName}/${toolResult.toolName}`)
          debug(`${header(e)} Result: ${JSON.stringify(toolResult.result, null, 2)}`)
        }
      }
      break
    }
    case "resolveThought": {
      log(`${header(e)} Resolved Thought:`, e.toolResult)
      break
    }
    case "attemptCompletion": {
      log(`${header(e)} Attempting completion`)
      break
    }
    case "completeRun": {
      logUsage(e)
      log(`${header(e)} Completing run`)
      debug(`${header(e)} Result:`, e.text)
      break
    }
    case "stopRunByInteractiveTool": {
      logUsage(e)
      log(`${header(e)} Stopping run by interactive tool`)
      break
    }
    case "stopRunByDelegate": {
      logUsage(e)
      log(`${header(e)} Stopping run by delegate`)
      break
    }
    case "stopRunByExceededMaxSteps": {
      logUsage(e)
      log(`${header(e)} Stopping run by exceeded max steps`)
      break
    }
    case "continueToNextStep": {
      logUsage(e)
      log(`${header(e)} Continuing to next step`)
      if (e.checkpoint.contextWindowUsage) {
        log(`${header(e)} Context window usage: ${e.checkpoint.contextWindowUsage.toFixed(2)}%`)
      }
      break
    }
  }
}

function logUsage(
  e: EventForType<
    | "continueToNextStep"
    | "completeRun"
    | "stopRunByInteractiveTool"
    | "stopRunByDelegate"
    | "stopRunByExceededMaxSteps"
  >,
) {
  const usageByStep = [
    `In: ${e.step.usage.inputTokens.toLocaleString()}`,
    `Reasoning: ${e.step.usage.reasoningTokens.toLocaleString()}`,
    `Out: ${e.step.usage.outputTokens.toLocaleString()}`,
    `Total: ${e.step.usage.totalTokens.toLocaleString()}`,
    `Cache-read: ${e.step.usage.cachedInputTokens.toLocaleString()}`,
  ].join(", ")
  const usageByRun = [
    `In: ${e.checkpoint.usage.inputTokens.toLocaleString()}`,
    `Reasoning: ${e.checkpoint.usage.reasoningTokens.toLocaleString()}`,
    `Out: ${e.checkpoint.usage.outputTokens.toLocaleString()}`,
    `Total: ${e.checkpoint.usage.totalTokens.toLocaleString()}`,
    `Cache-read: ${e.checkpoint.usage.cachedInputTokens.toLocaleString()}`,
  ].join(", ")
  log(`${header(e)} Tokens usage by step: ${usageByStep}`)
  log(`${header(e)} Tokens usage by run: ${usageByRun}`)
}
