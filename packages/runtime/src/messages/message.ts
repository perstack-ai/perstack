import { createId } from "@paralleldrive/cuid2"
import type {
  ExpertMessage,
  FileBinaryPart,
  FileInlinePart,
  FileUrlPart,
  ImageBinaryPart,
  ImageInlinePart,
  ImageUrlPart,
  InstructionMessage,
  Message,
  TextPart,
  ToolCallPart,
  ToolMessage,
  ToolResultPart,
  UserMessage,
} from "@perstack/core"
import type {
  AssistantModelMessage,
  FilePart as FileModelPart,
  ImagePart as ImageModelPart,
  ModelMessage,
  SystemModelMessage,
  TextPart as TextModelPart,
  ToolCallPart as ToolCallModelPart,
  ToolModelMessage,
  ToolResultPart as ToolResultModelPart,
  UserModelMessage,
} from "ai"
import { dedent } from "ts-dedent"

export function createUserMessage(
  contents: Array<
    | Omit<TextPart, "id">
    | Omit<ImageUrlPart, "id">
    | Omit<ImageInlinePart, "id">
    | Omit<ImageBinaryPart, "id">
    | Omit<FileUrlPart, "id">
    | Omit<FileInlinePart, "id">
    | Omit<FileBinaryPart, "id">
  >,
): UserMessage {
  return {
    type: "userMessage",
    contents: contents.map((part) => ({
      ...part,
      id: createId(),
    })),
    id: createId(),
  }
}

export function createExpertMessage(
  contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">>,
): ExpertMessage {
  return {
    type: "expertMessage",
    contents: contents.map((part) => ({
      ...part,
      id: createId(),
    })),
    id: createId(),
  }
}

export function createToolMessage(
  contents: Array<
    Omit<ToolResultPart, "id" | "contents"> & {
      contents: Array<Omit<TextPart, "id"> | Omit<ImageInlinePart, "id">>
    }
  >,
): ToolMessage {
  return {
    type: "toolMessage",
    contents: contents.map((part) => ({
      ...part,
      contents: part.contents.map((part) => ({
        ...part,
        id: createId(),
      })),
      id: createId(),
    })),
    id: createId(),
  }
}

export function messageToCoreMessage(message: Message): ModelMessage {
  switch (message.type) {
    case "instructionMessage":
      return {
        role: "system",
        content: instructionContentsToCoreContent(message.contents),
        providerOptions: message.cache
          ? {
              anthropic: { cacheControl: { type: "ephemeral" } },
            }
          : undefined,
      }
    case "userMessage":
      return {
        role: "user",
        content: userContentsToCoreContent(message.contents),
        providerOptions: message.cache
          ? {
              anthropic: { cacheControl: { type: "ephemeral" } },
            }
          : undefined,
      }
    case "expertMessage":
      return {
        role: "assistant",
        content: expertContentsToCoreContent(message.contents),
        providerOptions: message.cache
          ? {
              anthropic: { cacheControl: { type: "ephemeral" } },
            }
          : undefined,
      }
    case "toolMessage":
      return {
        role: "tool",
        content: toolContentsToCoreContent(message.contents),
        providerOptions: message.cache
          ? {
              anthropic: { cacheControl: { type: "ephemeral" } },
            }
          : undefined,
      }
  }
}
function instructionContentsToCoreContent(
  contents: InstructionMessage["contents"],
): SystemModelMessage["content"] {
  return contents.reduce((acc, part) => {
    return dedent`
      ${acc}
      ${part.text}
    `.trim()
  }, "" as string)
}
function userContentsToCoreContent(contents: UserMessage["contents"]): UserModelMessage["content"] {
  return contents.map((part) => {
    switch (part.type) {
      case "textPart":
        return textPartToCoreTextPart(part)
      case "imageUrlPart":
        return imageUrlPartToCoreImagePart(part)
      case "imageInlinePart":
        return imageInlinePartToCoreImagePart(part)
      case "imageBinaryPart":
        return imageBinaryPartToCoreImagePart(part)
      case "fileUrlPart":
        return fileUrlPartToCoreFilePart(part)
      case "fileInlinePart":
        return fileInlinePartToCoreFilePart(part)
      case "fileBinaryPart":
        return fileBinaryPartToCoreFilePart(part)
    }
  })
}
function expertContentsToCoreContent(
  contents: ExpertMessage["contents"],
): AssistantModelMessage["content"] {
  return contents.map((part) => {
    switch (part.type) {
      case "textPart":
        return textPartToCoreTextPart(part)
      case "toolCallPart":
        return toolCallPartToCoreToolCallPart(part)
    }
  })
}
function toolContentsToCoreContent(contents: ToolMessage["contents"]): ToolModelMessage["content"] {
  return contents.map((part) => {
    switch (part.type) {
      case "toolResultPart":
        return toolResultPartToCoreToolResultPart(part)
    }
  })
}
function textPartToCoreTextPart(part: TextPart): TextModelPart {
  return {
    type: "text",
    text: part.text,
  }
}
function imageUrlPartToCoreImagePart(part: ImageUrlPart): ImageModelPart {
  return {
    type: "image",
    image: part.url,
    mediaType: part.mimeType,
  }
}
function imageInlinePartToCoreImagePart(part: ImageInlinePart): ImageModelPart {
  return {
    type: "image",
    image: part.encodedData,
    mediaType: part.mimeType,
  }
}
function imageBinaryPartToCoreImagePart(part: ImageBinaryPart): ImageModelPart {
  return {
    type: "image",
    image: part.data,
    mediaType: part.mimeType,
  }
}
function fileUrlPartToCoreFilePart(part: FileUrlPart): FileModelPart {
  return {
    type: "file",
    data: part.url,
    mediaType: part.mimeType,
  }
}
function fileInlinePartToCoreFilePart(part: FileInlinePart): FileModelPart {
  return {
    type: "file",
    data: part.encodedData,
    mediaType: part.mimeType,
  }
}
function fileBinaryPartToCoreFilePart(part: FileBinaryPart): FileModelPart {
  return {
    type: "file",
    data: part.data,
    mediaType: part.mimeType,
  }
}
function toolCallPartToCoreToolCallPart(part: ToolCallPart): ToolCallModelPart {
  return {
    type: "tool-call",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    input: part.args,
  }
}
function toolResultPartToCoreToolResultPart(part: ToolResultPart): ToolResultModelPart {
  const content = part.contents[0]
  const output =
    content.type === "textPart"
      ? {
          type: "text" as const,
          value: content.text,
        }
      : {
          type: "content" as const,
          value: [
            {
              type: "media" as const,
              data: content.encodedData,
              mediaType: content.mimeType,
            },
          ],
        }
  return {
    type: "tool-result",
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    output,
  }
}
