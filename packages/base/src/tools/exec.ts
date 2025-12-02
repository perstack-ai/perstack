import { execFile, type ExecException } from "node:child_process"
import { promisify } from "node:util"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { validatePath } from "../lib/path.js"
import { successToolResult } from "../lib/tool-result.js"

const execFileAsync = promisify(execFile)
type ExecError = ExecException & { stdout?: string; stderr?: string }
function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && "code" in error
}
type ExecInput = {
  command: string
  args: string[]
  env: Record<string, string>
  cwd: string
  stdout: boolean
  stderr: boolean
  timeout?: number
}
export async function exec(input: ExecInput) {
  const validatedCwd = await validatePath(input.cwd)
  const { stdout, stderr } = await execFileAsync(input.command, input.args, {
    cwd: validatedCwd,
    env: { ...process.env, ...input.env },
    timeout: input.timeout,
  })
  let output = ""
  if (input.stdout) {
    output += stdout
  }
  if (input.stderr) {
    output += stderr
  }
  if (!output.trim()) {
    output = "Command executed successfully, but produced no output."
  }
  return { output }
}

export function registerExec(server: McpServer) {
  server.registerTool(
    "exec",
    {
      title: "Execute Command",
      description: dedent`
        Command executor for running system commands and scripts.

        Use cases:
        - Running system tasks or scripts
        - Automating command-line tools or utilities
        - Executing build commands or test runners

        How it works:
        - Executes the specified command with arguments
        - Captures stdout and/or stderr based on flags
        - Returns command output or error information

        Parameters:
        - command: The command to execute (e.g., ls, python)
        - args: Arguments to pass to the command
        - env: Environment variables for the execution
        - cwd: Working directory for command execution
        - stdout: Whether to capture standard output
        - stderr: Whether to capture standard error
        - timeout: Timeout in milliseconds (optional)

        Rules:
        - Only execute commands from trusted sources
        - Do not execute long-running foreground commands (e.g., tail -f)
        - Be cautious with resource-intensive commands
      `,
      inputSchema: {
        command: z.string().describe("The command to execute"),
        args: z.array(z.string()).describe("The arguments to pass to the command"),
        env: z.record(z.string(), z.string()).describe("The environment variables to set"),
        cwd: z.string().describe("The working directory to execute the command in"),
        stdout: z.boolean().describe("Whether to capture the standard output"),
        stderr: z.boolean().describe("Whether to capture the standard error"),
        timeout: z.number().optional().describe("Timeout in milliseconds"),
      },
    },
    async (input: ExecInput) => {
      try {
        return successToolResult(await exec(input))
      } catch (error: unknown) {
        let message: string
        let stdout: string | undefined
        let stderr: string | undefined
        if (isExecError(error)) {
          if ((error.killed || error.signal === "SIGTERM") && typeof input.timeout === "number") {
            message = `Command timed out after ${input.timeout}ms.`
          } else if (error.message.includes("timeout")) {
            message = `Command timed out after ${input.timeout}ms.`
          } else {
            message = error.message
          }
          stdout = error.stdout
          stderr = error.stderr
        } else if (error instanceof Error) {
          message = error.message
        } else {
          message = "An unknown error occurred."
        }
        const result: { error: string; stdout?: string; stderr?: string } = { error: message }
        if (stdout && input.stdout) {
          result.stdout = stdout
        }
        if (stderr && input.stderr) {
          result.stderr = stderr
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    },
  )
}
