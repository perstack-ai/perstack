import { type RunEvent, startRun } from "@perstack/core"
import { createInstructionMessage } from "../messages/instruction-message.js"
import { createToolMessage, createUserMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

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
          createInstructionMessage(expert, experts),
          createUserMessage([{ type: "textPart", text: setting.input.text }]),
        ],
      })
    }
    case "stoppedByDelegate":
    case "stoppedByInteractiveTool": {
      if (!setting.input.interactiveToolCallResult) {
        throw new Error("Interactive tool call result is undefined")
      }
      return startRun(setting, checkpoint, {
        initialCheckpoint: checkpoint,
        inputMessages: [
          createToolMessage([
            {
              type: "toolResultPart",
              toolCallId: setting.input.interactiveToolCallResult.toolCallId,
              toolName: setting.input.interactiveToolCallResult.toolName,
              contents: [{ type: "textPart", text: setting.input.interactiveToolCallResult.text }],
            },
          ]),
        ],
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
