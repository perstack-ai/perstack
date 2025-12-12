import { z } from "zod"

export type RuntimeName = "perstack" | "cursor" | "claude-code" | "gemini" | "docker"

export const runtimeNameSchema = z.enum(["perstack", "cursor", "claude-code", "gemini", "docker"])
