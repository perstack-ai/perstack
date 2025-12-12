import type { PerstackConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  extractRequiredEnvVars,
  generateComposeEnvSection,
  generateDockerEnvArgs,
  getProviderEnvKeys,
  resolveEnvValues,
} from "./env-resolver.js"

describe("getProviderEnvKeys", () => {
  it("should return ANTHROPIC_API_KEY for anthropic provider", () => {
    expect(getProviderEnvKeys({ providerName: "anthropic" })).toEqual(["ANTHROPIC_API_KEY"])
  })

  it("should return OPENAI_API_KEY for openai provider", () => {
    expect(getProviderEnvKeys({ providerName: "openai" })).toEqual(["OPENAI_API_KEY"])
  })

  it("should return GOOGLE_API_KEY for google provider", () => {
    expect(getProviderEnvKeys({ providerName: "google" })).toEqual(["GOOGLE_API_KEY"])
  })

  it("should return multiple keys for amazon-bedrock provider", () => {
    const keys = getProviderEnvKeys({ providerName: "amazon-bedrock" })
    expect(keys).toContain("AWS_ACCESS_KEY_ID")
    expect(keys).toContain("AWS_SECRET_ACCESS_KEY")
    expect(keys).toContain("AWS_REGION")
  })

  it("should return empty array for ollama provider", () => {
    expect(getProviderEnvKeys({ providerName: "ollama" })).toEqual([])
  })

  it("should return empty array when no provider", () => {
    expect(getProviderEnvKeys(undefined)).toEqual([])
  })
})

describe("extractRequiredEnvVars", () => {
  it("should extract provider env key", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      experts: {
        "test-expert": {
          instruction: "test",
        },
      },
    }
    const reqs = extractRequiredEnvVars(config, "test-expert")
    expect(reqs.some((r) => r.name === "ANTHROPIC_API_KEY")).toBe(true)
  })

  it("should extract skill requiredEnv", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            "test-skill": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "test-pkg",
              requiredEnv: ["GH_TOKEN", "GITHUB_REPO"],
            },
          },
        },
      },
    }
    const reqs = extractRequiredEnvVars(config, "test-expert")
    expect(reqs.some((r) => r.name === "GH_TOKEN")).toBe(true)
    expect(reqs.some((r) => r.name === "GITHUB_REPO")).toBe(true)
  })

  it("should always include optional PERSTACK_API_KEY", () => {
    const config: PerstackConfig = {}
    const reqs = extractRequiredEnvVars(config, "any")
    const perstackReq = reqs.find((r) => r.name === "PERSTACK_API_KEY")
    expect(perstackReq).toBeDefined()
    expect(perstackReq?.required).toBe(false)
  })

  it("should not duplicate env vars", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            skill1: {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "pkg1",
              requiredEnv: ["SHARED_TOKEN"],
            },
            skill2: {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "pkg2",
              requiredEnv: ["SHARED_TOKEN"],
            },
          },
        },
      },
    }
    const reqs = extractRequiredEnvVars(config, "test-expert")
    const sharedCount = reqs.filter((r) => r.name === "SHARED_TOKEN").length
    expect(sharedCount).toBe(1)
  })
})

describe("resolveEnvValues", () => {
  it("should resolve all required env vars", () => {
    const requirements = [
      { name: "API_KEY", source: "provider" as const, required: true },
      { name: "TOKEN", source: "skill" as const, required: true },
    ]
    const env = { API_KEY: "key123", TOKEN: "token456" }
    const { resolved, missing } = resolveEnvValues(requirements, env)
    expect(resolved).toEqual({ API_KEY: "key123", TOKEN: "token456" })
    expect(missing).toEqual([])
  })

  it("should report missing required env vars", () => {
    const requirements = [
      { name: "API_KEY", source: "provider" as const, required: true },
      { name: "OPTIONAL", source: "runtime" as const, required: false },
    ]
    const env = { OPTIONAL: "value" }
    const { resolved, missing } = resolveEnvValues(requirements, env)
    expect(resolved).toEqual({ OPTIONAL: "value" })
    expect(missing).toEqual(["API_KEY"])
  })

  it("should skip optional env vars that are not set", () => {
    const requirements = [{ name: "OPTIONAL", source: "runtime" as const, required: false }]
    const env = {}
    const { resolved, missing } = resolveEnvValues(requirements, env)
    expect(resolved).toEqual({})
    expect(missing).toEqual([])
  })

  it("should include empty string values", () => {
    const requirements = [{ name: "EMPTY_VAR", source: "provider" as const, required: true }]
    const env = { EMPTY_VAR: "" }
    const { resolved, missing } = resolveEnvValues(requirements, env)
    expect(resolved).toEqual({ EMPTY_VAR: "" })
    expect(missing).toEqual([])
  })
})

describe("generateDockerEnvArgs", () => {
  it("should generate -e flags for each env var", () => {
    const envVars = { API_KEY: "key123", TOKEN: "token456" }
    const args = generateDockerEnvArgs(envVars)
    expect(args).toEqual(["-e", "API_KEY=key123", "-e", "TOKEN=token456"])
  })

  it("should return empty array for no env vars", () => {
    const args = generateDockerEnvArgs({})
    expect(args).toEqual([])
  })
})

describe("generateComposeEnvSection", () => {
  it("should generate environment section", () => {
    const envKeys = ["API_KEY", "TOKEN"]
    const section = generateComposeEnvSection(envKeys)
    expect(section).toContain("environment:")
    expect(section).toContain("- API_KEY")
    expect(section).toContain("- TOKEN")
  })

  it("should return empty string for no env keys", () => {
    const section = generateComposeEnvSection([])
    expect(section).toBe("")
  })
})
