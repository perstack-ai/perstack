import type { AdapterRunParams } from "@perstack/core"

export function buildCliArgs(setting: AdapterRunParams["setting"]): string[] {
  const args: string[] = []

  if (setting.jobId !== undefined) {
    args.push("--job-id", setting.jobId)
  }
  if (setting.runId !== undefined) {
    args.push("--run-id", setting.runId)
  }
  if (setting.model !== undefined) {
    args.push("--model", setting.model)
  }

  const maxSteps = setting.maxSteps ?? 100
  args.push("--max-steps", String(maxSteps))

  if (setting.maxRetries !== undefined) {
    args.push("--max-retries", String(setting.maxRetries))
  }
  if (setting.timeout !== undefined) {
    args.push("--timeout", String(setting.timeout))
  }

  if (setting.input.interactiveToolCallResult) {
    args.push("-i")
    args.push(JSON.stringify(setting.input.interactiveToolCallResult))
  } else {
    args.push(setting.input.text ?? "")
  }

  return args
}
