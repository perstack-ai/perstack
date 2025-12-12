import { execSync } from "node:child_process"

let cachedVersion: string | null = null

export function getRuntimeVersion(): string {
  if (cachedVersion) {
    return cachedVersion
  }
  try {
    const result = execSync("perstack-runtime --version", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    })
    cachedVersion = result.trim() || "unknown"
  } catch {
    cachedVersion = "unknown"
  }
  return cachedVersion
}
