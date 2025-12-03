import type {
  Expert,
  FileInlinePart,
  ImageInlinePart,
  RunEvent,
  RuntimeEvent,
  SkillType,
  TextPart,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"

export class DelegateSkillManager extends BaseSkillManager {
  readonly name: string
  readonly type: SkillType = "delegate"
  readonly lazyInit = false
  override readonly expert: Expert

  constructor(
    expert: Expert,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ) {
    super(runId, eventListener)
    this.name = expert.name
    this.expert = expert
  }

  protected override async _doInit(): Promise<void> {
    this._toolDefinitions = [
      {
        skillName: this.expert.name,
        name: this.expert.name.split("/").pop() ?? this.expert.name,
        description: this.expert.description,
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        interactive: false,
      },
    ]
  }

  override async close(): Promise<void> {}

  override async callTool(
    _toolName: string,
    _input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>> {
    return []
  }
}
