import { createId } from "@paralleldrive/cuid2"
import { type RunEvent, startRun, type ToolResult } from "@perstack/core"
import { createInstructionMessage } from "../../messages/instruction-message.js"
import { createUserMessage } from "../../messages/message.js"
import type { RunSnapshot } from "../machine.js"

export async function initLogic({
  setting,
  checkpoint,
}: RunSnapshot["context"]): Promise<RunEvent> {
  const { expertKey, experts } = setting
  const expert = experts[expertKey]
  switch (checkpoint.status) {
    case "init": {
      if (!setting.input.text) {
        throw new Error("Input message is undefined")
      }
      return startRun(setting, checkpoint, {
        initialCheckpoint: checkpoint,
        inputMessages: [
          createInstructionMessage(expert, experts, setting.startedAt),
          createUserMessage([{ type: "textPart", text: setting.input.text }]),
        ],
      })
    }
    case "stoppedByDelegate":
    case "stoppedByInteractiveTool": {
      if (!setting.input.interactiveToolCallResult) {
        throw new Error("Interactive tool call result is undefined")
      }
      const { toolCallId, toolName, skillName, text } = setting.input.interactiveToolCallResult
      const pendingToolCalls = checkpoint.pendingToolCalls ?? []
      const newToolResult: ToolResult = {
        id: toolCallId,
        skillName,
        toolName,
        result: [{ type: "textPart", id: createId(), text }],
      }
      const updatedPartialResults = [...(checkpoint.partialToolResults ?? []), newToolResult]
      const updatedPendingToolCalls = pendingToolCalls.filter((tc) => tc.id !== toolCallId)
      const updatedCheckpoint = {
        ...checkpoint,
        partialToolResults: updatedPartialResults,
        pendingToolCalls: updatedPendingToolCalls.length > 0 ? updatedPendingToolCalls : undefined,
      }
      return startRun(setting, updatedCheckpoint, {
        initialCheckpoint: updatedCheckpoint,
        inputMessages: [],
      })
    }
    default:
      if (!setting.input.text) {
        throw new Error("Input message is undefined")
      }
      return startRun(setting, checkpoint, {
        initialCheckpoint: checkpoint,
        inputMessages: [createUserMessage([{ type: "textPart", text: setting.input.text }])],
      })
  }
}
