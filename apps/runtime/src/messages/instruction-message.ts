import { createId } from "@paralleldrive/cuid2"
import type { Expert, InstructionMessage } from "@perstack/core"
import { dedent } from "ts-dedent"

function getMetaInstruction(startedAt: number): string {
  return dedent`
    IMPORTANT:
    Based on the user's initial message, you must determine what needs to be done.
    You must iterate through hypothesis and verification to fulfill the task.
    YOU MUST CONTINUE TO CALL TOOLS UNTIL THE TASK IS COMPLETE.
    If you do not call tools, the task will be considered complete, and the agent loop will end.

    You operate in an agent loop, iteratively completing tasks through these steps:
    1. Analyze Events: Understand user needs and current state through the event stream, focusing on the latest user messages and execution results
    2. Select Tools: Choose the next tool call based on current state, task planning, relevant knowledge, and available data APIs
    3. Wait for Execution: The selected tool action will be executed by the sandbox environment with new observations added to the event stream
    4. Iterate: Choose only one tool call per iteration, patiently repeat the above steps until task completion
    5. Notify Task Completion: Call attemptCompletion ONLY - do NOT include any text response with this tool call
    6. Generate Final Results: AFTER attemptCompletion returns, you will be prompted to produce a final result in a SEPARATE response

    Conditions for ending the agent loop:
    If any of the following apply, **immediately call the attemptCompletion tool**.
    When the agent loop must end, calling any tool other than attemptCompletion is highly dangerous.
    Under all circumstances, strictly follow this rule.
    - When the task is complete
    - When the user's request is outside your expertise
    - When the user's request is unintelligible

    Rules for requests outside your area of expertise:
    - Tell your area of expertise to the user in final results

    Environment information:
    - Current time is ${new Date(startedAt).toISOString()}
    - Current working directory is ${process.cwd()}
  `
}

export function createInstructionMessage(
  expert: Expert,
  experts: Record<string, Expert>,
  startedAt: number,
): InstructionMessage {
  const instruction = dedent`
    You are Perstack, an AI expert that tackles tasks requested by users by utilizing all available tools.

    (The following information describes your nature and role as an AI, the mechanisms of the AI system, and other meta-cognitive aspects.)

    ${getMetaInstruction(startedAt)}

    ---
    (The following describes the objective, steps, rules, etc. regarding your expert task.)

    ${expert.instruction}

    ---
    (The following is an overview of each skill and the rules for calling tools.)

    ${getSkillRules(expert)}

    ---
    (The following is an overview of each delegate expert and the rules for calling tools.)

    You can delegate tasks to the following experts by calling delegate expert name as a tool:

    ${getDelegateRules(expert, experts)}
  `
  return {
    type: "instructionMessage",
    contents: [
      {
        id: createId(),
        type: "textPart",
        text: instruction,
      },
    ],
    id: createId(),
    cache: true,
  }
}

function getSkillRules(expert: Expert): string {
  return Object.values(expert.skills).reduce((acc, skill) => {
    if (!skill.rule) {
      return acc
    }
    return dedent`
      ${acc}

      "${skill.name}" skill rules:
      ${skill.rule}
    `.trim()
  }, "" as string)
}

function getDelegateRules(expert: Expert, experts: Record<string, Expert>): string {
  return expert.delegates.reduce((acc, delegateExpertName) => {
    const delegate = experts[delegateExpertName]
    if (!delegate) {
      return acc
    }
    return dedent`
      ${acc}

      About "${delegate.name}":
      ${delegate.description}
    `.trim()
  }, "" as string)
}
