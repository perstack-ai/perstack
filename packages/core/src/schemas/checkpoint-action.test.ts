import { describe, expect, it } from "vitest"
import {
  type CheckpointAction,
  checkpointActionAppendTextFileSchema,
  checkpointActionAttemptCompletionSchema,
  checkpointActionCreateDirectorySchema,
  checkpointActionDelegateSchema,
  checkpointActionDeleteFileSchema,
  checkpointActionEditTextFileSchema,
  checkpointActionErrorSchema,
  checkpointActionGeneralToolSchema,
  checkpointActionGetFileInfoSchema,
  checkpointActionInteractiveToolSchema,
  checkpointActionListDirectorySchema,
  checkpointActionMoveFileSchema,
  checkpointActionReadImageFileSchema,
  checkpointActionReadPdfFileSchema,
  checkpointActionReadTextFileSchema,
  checkpointActionRetrySchema,
  checkpointActionSchema,
  checkpointActionTestUrlSchema,
  checkpointActionThinkSchema,
  checkpointActionTodoSchema,
  checkpointActionWriteTextFileSchema,
} from "./checkpoint-action.js"

describe("checkpointActionRetrySchema", () => {
  it("parses valid retry action", () => {
    const action = checkpointActionRetrySchema.parse({
      type: "retry",
      error: "RateLimitError",
      message: "Rate limit exceeded, retrying...",
    })
    expect(action.type).toBe("retry")
    expect(action.error).toBe("RateLimitError")
    expect(action.message).toBe("Rate limit exceeded, retrying...")
  })

  it("rejects missing required fields", () => {
    expect(() => checkpointActionRetrySchema.parse({ type: "retry" })).toThrow()
  })
})

describe("checkpointActionAttemptCompletionSchema", () => {
  it("parses valid attemptCompletion action", () => {
    const action = checkpointActionAttemptCompletionSchema.parse({
      type: "attemptCompletion",
      result: "Task completed successfully",
    })
    expect(action.type).toBe("attemptCompletion")
    expect(action.result).toBe("Task completed successfully")
  })

  it("parses with optional error field", () => {
    const action = checkpointActionAttemptCompletionSchema.parse({
      type: "attemptCompletion",
      result: "",
      error: "No result found",
    })
    expect(action.error).toBe("No result found")
  })
})

describe("checkpointActionThinkSchema", () => {
  it("parses valid think action", () => {
    const action = checkpointActionThinkSchema.parse({
      type: "think",
      thought: "I need to analyze the codebase first",
    })
    expect(action.type).toBe("think")
    expect(action.thought).toBe("I need to analyze the codebase first")
  })
})

describe("checkpointActionTodoSchema", () => {
  it("parses valid todo action", () => {
    const action = checkpointActionTodoSchema.parse({
      type: "todo",
      newTodos: ["Implement feature A", "Write tests"],
      completedTodos: [0],
      todos: [
        { id: 0, title: "Setup project", completed: true },
        { id: 1, title: "Implement feature A", completed: false },
        { id: 2, title: "Write tests", completed: false },
      ],
    })
    expect(action.type).toBe("todo")
    expect(action.newTodos).toHaveLength(2)
    expect(action.completedTodos).toEqual([0])
    expect(action.todos).toHaveLength(3)
  })

  it("parses empty arrays", () => {
    const action = checkpointActionTodoSchema.parse({
      type: "todo",
      newTodos: [],
      completedTodos: [],
      todos: [],
    })
    expect(action.newTodos).toEqual([])
    expect(action.completedTodos).toEqual([])
    expect(action.todos).toEqual([])
  })
})

describe("checkpointActionReadImageFileSchema", () => {
  it("parses valid readImageFile action", () => {
    const action = checkpointActionReadImageFileSchema.parse({
      type: "readImageFile",
      path: "/path/to/image.png",
      mimeType: "image/png",
      size: 1024,
    })
    expect(action.type).toBe("readImageFile")
    expect(action.path).toBe("/path/to/image.png")
    expect(action.mimeType).toBe("image/png")
  })

  it("parses with minimal fields", () => {
    const action = checkpointActionReadImageFileSchema.parse({
      type: "readImageFile",
      path: "/path/to/image.jpg",
    })
    expect(action.mimeType).toBeUndefined()
    expect(action.size).toBeUndefined()
  })
})

describe("checkpointActionReadPdfFileSchema", () => {
  it("parses valid readPdfFile action", () => {
    const action = checkpointActionReadPdfFileSchema.parse({
      type: "readPdfFile",
      path: "/path/to/document.pdf",
      mimeType: "application/pdf",
      size: 2048,
    })
    expect(action.type).toBe("readPdfFile")
    expect(action.path).toBe("/path/to/document.pdf")
  })
})

describe("checkpointActionReadTextFileSchema", () => {
  it("parses valid readTextFile action", () => {
    const action = checkpointActionReadTextFileSchema.parse({
      type: "readTextFile",
      path: "/path/to/file.ts",
      content: "export const hello = 'world'",
      from: 0,
      to: 10,
    })
    expect(action.type).toBe("readTextFile")
    expect(action.path).toBe("/path/to/file.ts")
    expect(action.content).toBe("export const hello = 'world'")
    expect(action.from).toBe(0)
    expect(action.to).toBe(10)
  })

  it("parses without line range", () => {
    const action = checkpointActionReadTextFileSchema.parse({
      type: "readTextFile",
      path: "/path/to/file.ts",
      content: "file content",
    })
    expect(action.from).toBeUndefined()
    expect(action.to).toBeUndefined()
  })
})

describe("checkpointActionEditTextFileSchema", () => {
  it("parses valid editTextFile action", () => {
    const action = checkpointActionEditTextFileSchema.parse({
      type: "editTextFile",
      path: "/path/to/file.ts",
      oldText: "const a = 1",
      newText: "const a = 2",
    })
    expect(action.type).toBe("editTextFile")
    expect(action.oldText).toBe("const a = 1")
    expect(action.newText).toBe("const a = 2")
  })
})

describe("checkpointActionAppendTextFileSchema", () => {
  it("parses valid appendTextFile action", () => {
    const action = checkpointActionAppendTextFileSchema.parse({
      type: "appendTextFile",
      path: "/path/to/file.txt",
      text: "appended text",
    })
    expect(action.type).toBe("appendTextFile")
    expect(action.text).toBe("appended text")
  })
})

describe("checkpointActionDeleteFileSchema", () => {
  it("parses valid deleteFile action", () => {
    const action = checkpointActionDeleteFileSchema.parse({
      type: "deleteFile",
      path: "/path/to/file.txt",
    })
    expect(action.type).toBe("deleteFile")
    expect(action.path).toBe("/path/to/file.txt")
  })
})

describe("checkpointActionMoveFileSchema", () => {
  it("parses valid moveFile action", () => {
    const action = checkpointActionMoveFileSchema.parse({
      type: "moveFile",
      source: "/old/path.txt",
      destination: "/new/path.txt",
    })
    expect(action.type).toBe("moveFile")
    expect(action.source).toBe("/old/path.txt")
    expect(action.destination).toBe("/new/path.txt")
  })
})

describe("checkpointActionGetFileInfoSchema", () => {
  it("parses valid getFileInfo action", () => {
    const action = checkpointActionGetFileInfoSchema.parse({
      type: "getFileInfo",
      path: "/path/to/file.txt",
      exists: true,
      absolutePath: "/full/path/to/file.txt",
      name: "file.txt",
      directory: "/full/path/to",
      extension: ".txt",
      mimeType: "text/plain",
      size: 1024,
      sizeFormatted: "1 KB",
      created: "2024-01-01T00:00:00Z",
      modified: "2024-01-02T00:00:00Z",
      accessed: "2024-01-03T00:00:00Z",
      permissions: {
        readable: true,
        writable: true,
        executable: false,
      },
    })
    expect(action.type).toBe("getFileInfo")
    expect(action.exists).toBe(true)
    expect(action.permissions.readable).toBe(true)
  })
})

describe("checkpointActionWriteTextFileSchema", () => {
  it("parses valid writeTextFile action", () => {
    const action = checkpointActionWriteTextFileSchema.parse({
      type: "writeTextFile",
      path: "/path/to/file.txt",
      text: "file content",
    })
    expect(action.type).toBe("writeTextFile")
    expect(action.text).toBe("file content")
  })
})

describe("checkpointActionCreateDirectorySchema", () => {
  it("parses valid createDirectory action", () => {
    const action = checkpointActionCreateDirectorySchema.parse({
      type: "createDirectory",
      path: "/path/to/new/directory",
    })
    expect(action.type).toBe("createDirectory")
    expect(action.path).toBe("/path/to/new/directory")
  })
})

describe("checkpointActionListDirectorySchema", () => {
  it("parses valid listDirectory action", () => {
    const action = checkpointActionListDirectorySchema.parse({
      type: "listDirectory",
      path: "/path/to/directory",
      items: [
        {
          name: "file.txt",
          path: "/path/to/directory/file.txt",
          type: "file",
          size: 1024,
          modified: "2024-01-01T00:00:00Z",
        },
        {
          name: "subdir",
          path: "/path/to/directory/subdir",
          type: "directory",
          size: 0,
          modified: "2024-01-01T00:00:00Z",
        },
      ],
    })
    expect(action.type).toBe("listDirectory")
    expect(action.items).toHaveLength(2)
    expect(action.items[0].type).toBe("file")
    expect(action.items[1].type).toBe("directory")
  })

  it("parses empty directory", () => {
    const action = checkpointActionListDirectorySchema.parse({
      type: "listDirectory",
      path: "/empty/directory",
      items: [],
    })
    expect(action.items).toEqual([])
  })
})

describe("checkpointActionTestUrlSchema", () => {
  it("parses valid testUrl action", () => {
    const action = checkpointActionTestUrlSchema.parse({
      type: "testUrl",
      results: [
        {
          url: "https://example.com",
          status: 200,
          title: "Example Domain",
          description: "This domain is for use in examples",
        },
      ],
    })
    expect(action.type).toBe("testUrl")
    expect(action.results).toHaveLength(1)
    expect(action.results[0].status).toBe(200)
  })
})

describe("checkpointActionDelegateSchema", () => {
  it("parses valid delegate action", () => {
    const action = checkpointActionDelegateSchema.parse({
      type: "delegate",
      delegateTo: [
        {
          expertKey: "code-reviewer@1.0.0",
          query: "Review the changes in PR #123",
        },
      ],
    })
    expect(action.type).toBe("delegate")
    expect(action.delegateTo).toHaveLength(1)
    expect(action.delegateTo[0].expertKey).toBe("code-reviewer@1.0.0")
  })

  it("parses parallel delegation", () => {
    const action = checkpointActionDelegateSchema.parse({
      type: "delegate",
      delegateTo: [
        { expertKey: "expert-a@1.0.0", query: "Task A" },
        { expertKey: "expert-b@1.0.0", query: "Task B" },
      ],
    })
    expect(action.delegateTo).toHaveLength(2)
  })
})

describe("checkpointActionInteractiveToolSchema", () => {
  it("parses valid interactiveTool action", () => {
    const action = checkpointActionInteractiveToolSchema.parse({
      type: "interactiveTool",
      skillName: "@perstack/browser",
      toolName: "askUser",
      args: { question: "What should I do next?" },
    })
    expect(action.type).toBe("interactiveTool")
    expect(action.skillName).toBe("@perstack/browser")
    expect(action.toolName).toBe("askUser")
  })
})

describe("checkpointActionGeneralToolSchema", () => {
  it("parses valid generalTool action", () => {
    const action = checkpointActionGeneralToolSchema.parse({
      type: "generalTool",
      skillName: "@custom/skill",
      toolName: "customTool",
      args: { input: "test" },
      result: [{ type: "textPart", id: "1", text: "result" }],
    })
    expect(action.type).toBe("generalTool")
    expect(action.skillName).toBe("@custom/skill")
    expect(action.result).toHaveLength(1)
  })
})

describe("checkpointActionErrorSchema", () => {
  it("parses valid error action", () => {
    const action = checkpointActionErrorSchema.parse({
      type: "error",
      error: "Failed to parse tool result",
    })
    expect(action.type).toBe("error")
    expect(action.error).toBe("Failed to parse tool result")
  })

  it("parses error action without message", () => {
    const action = checkpointActionErrorSchema.parse({
      type: "error",
    })
    expect(action.type).toBe("error")
    expect(action.error).toBeUndefined()
  })
})

describe("checkpointActionSchema (discriminated union)", () => {
  it("parses different action types correctly", () => {
    const actions: CheckpointAction[] = [
      { type: "retry", error: "err", message: "msg" },
      { type: "attemptCompletion", result: "done" },
      { type: "think", thought: "thinking..." },
      { type: "todo", newTodos: [], completedTodos: [], todos: [] },
      { type: "readImageFile", path: "/img.png" },
      { type: "readPdfFile", path: "/doc.pdf" },
      { type: "readTextFile", path: "/file.txt", content: "text" },
      { type: "editTextFile", path: "/file.txt" },
      { type: "appendTextFile", path: "/file.txt", text: "appended" },
      { type: "deleteFile", path: "/file.txt" },
      { type: "moveFile", source: "/a", destination: "/b" },
      {
        type: "getFileInfo",
        path: "/file.txt",
        exists: true,
        absolutePath: "/file.txt",
        name: "file.txt",
        directory: "/",
        size: 0,
        sizeFormatted: "0 B",
        created: "2024-01-01T00:00:00Z",
        modified: "2024-01-01T00:00:00Z",
        accessed: "2024-01-01T00:00:00Z",
        permissions: { readable: true, writable: true, executable: false },
      },
      { type: "writeTextFile", path: "/file.txt", text: "content" },
      { type: "createDirectory", path: "/dir" },
      { type: "listDirectory", path: "/dir", items: [] },
      { type: "testUrl", results: [] },
      { type: "delegate", delegateTo: [] },
      { type: "interactiveTool", skillName: "s", toolName: "t", args: {} },
      { type: "generalTool", skillName: "s", toolName: "t", args: {}, result: [] },
      { type: "error" },
    ]

    for (const action of actions) {
      const parsed = checkpointActionSchema.parse(action)
      expect(parsed.type).toBe(action.type)
    }
  })

  it("rejects invalid type", () => {
    expect(() => checkpointActionSchema.parse({ type: "invalid" })).toThrow()
  })
})
