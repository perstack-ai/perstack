import { z } from "zod"

export type RuntimeName = "local" | "cursor" | "claude-code" | "gemini" | "docker"

export const runtimeNameSchema = z.enum(["local", "cursor", "claude-code", "gemini", "docker"])
