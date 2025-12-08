import type {
  FileInlinePart,
  ImageInlinePart,
  InteractiveSkill,
  RunEvent,
  RuntimeEvent,
  SkillType,
  TextPart,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"

export class InteractiveSkillManager extends BaseSkillManager {
  readonly name: string
  readonly type: SkillType = "interactive"
  readonly lazyInit = false
  override readonly interactiveSkill: InteractiveSkill

  constructor(
    interactiveSkill: InteractiveSkill,
    jobId: string,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ) {
    super(jobId, runId, eventListener)
    this.name = interactiveSkill.name
    this.interactiveSkill = interactiveSkill
  }

  protected override async _doInit(): Promise<void> {
    this._toolDefinitions = Object.values(this.interactiveSkill.tools).map((tool) => ({
      skillName: this.interactiveSkill.name,
      name: tool.name,
      description: tool.description,
      inputSchema: JSON.parse(tool.inputJsonSchema),
      interactive: true,
    }))
  }

  override async close(): Promise<void> {}

  override async callTool(
    _toolName: string,
    _input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>> {
    return []
  }
}
