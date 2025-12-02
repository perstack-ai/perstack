import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

class Thought {
  thoughtHistory: { thought: string; nextThoughtNeeded?: boolean }[] = []
  public processThought(input: { thought: string; nextThoughtNeeded?: boolean }) {
    const { nextThoughtNeeded } = input
    this.thoughtHistory.push(input)
    return {
      nextThoughtNeeded,
      thoughtHistoryLength: this.thoughtHistory.length,
    }
  }
}
const thought = new Thought()
export async function think(input: { thought: string; nextThoughtNeeded?: boolean }) {
  return thought.processThought(input)
}

export function registerThink(server: McpServer) {
  server.registerTool(
    "think",
    {
      title: "think",
      description: dedent`
      Sequential thinking tool for step-by-step problem analysis and solution development.

      Use cases:
      - Breaking down complex problems into manageable steps
      - Developing solutions through iterative reasoning
      - Analyzing problems that require multiple perspectives
      - Planning tasks with dependencies and considerations

      How it works:
      - Records each thinking step sequentially
      - Maintains thought history for context
      - Continues until solution is reached
      - Returns thought count and continuation status

      Parameters:
      - thought: Current reasoning step or analysis
      - nextThoughtNeeded: Whether additional thinking is required (optional)

      Best practices:
      - Use multiple calls for sophisticated reasoning chains
      - Progress from high-level overview to detailed analysis (drill-down approach)
      - Capture insights and eureka moments as they emerge
      - Engage in reflective introspection and constructive self-critique
      - Set nextThoughtNeeded to false only when fully satisfied with the solution
    `,
      inputSchema: {
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z
          .boolean()
          .optional()
          .describe("true if you need more thinking, even if at what seemed like the end"),
      },
    },
    async (input: { thought: string; nextThoughtNeeded?: boolean }) => {
      try {
        return successToolResult(await think(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
