#!/usr/bin/env node
import { spawn } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { LLMProvider } from "@perstack/tui"
import { renderWizard } from "@perstack/tui"
import { Command } from "commander"
import { config } from "dotenv"
import {
  detectAllLLMs,
  detectAllRuntimes,
  generateAgentsMd,
  generateCreateExpertToml,
  getDefaultModel,
} from "../src/index.js"

config()

function getEnvVarName(provider: LLMProvider): string {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY"
    case "openai":
      return "OPENAI_API_KEY"
    case "google":
      return "GOOGLE_GENERATIVE_AI_API_KEY"
  }
}

const program = new Command()
  .name("create-expert")
  .description("Create Perstack Experts interactively")
  .version("0.0.1")
  .argument("[expertName]", "Expert name to improve (for improvement mode)")
  .argument("[improvements]", "Improvement description (for improvement mode)")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action(async (expertName?: string, improvements?: string, options?: { cwd: string }) => {
    const cwd = options?.cwd || process.cwd()
    const isImprovement = Boolean(expertName)
    const improvementTarget = improvements || ""
    const perstackTomlPath = join(cwd, "perstack.toml")
    const agentsMdPath = join(cwd, "AGENTS.md")
    const envPath = join(cwd, ".env")
    const llms = detectAllLLMs()
    const runtimes = detectAllRuntimes()
    const wizardResult = await renderWizard({
      llms,
      runtimes,
      isImprovement,
      improvementTarget,
    })
    if (!wizardResult) {
      console.log("Wizard cancelled.")
      process.exit(0)
    }
    if (wizardResult.apiKey && wizardResult.provider) {
      const envVarName = getEnvVarName(wizardResult.provider)
      const envContent = `${envVarName}=${wizardResult.apiKey}\n`
      if (existsSync(envPath)) {
        const existing = readFileSync(envPath, "utf-8")
        const hasEnvVar = new RegExp(`^${envVarName}=`, "m").test(existing)
        if (!hasEnvVar) {
          writeFileSync(envPath, `${existing}\n${envContent}`)
          console.log(`✓ Added ${envVarName} to .env`)
        }
      } else {
        writeFileSync(envPath, envContent)
        console.log(`✓ Created .env with ${envVarName}`)
      }
      process.env[envVarName] = wizardResult.apiKey
    }
    const isDefaultRuntime = wizardResult.runtime === "default"
    if (!isImprovement) {
      if (isDefaultRuntime) {
        const provider = wizardResult.provider || "anthropic"
        const model = wizardResult.model || getDefaultModel(provider)
        const agentsMd = generateAgentsMd({ provider, model })
        writeFileSync(agentsMdPath, agentsMd)
        console.log("✓ Created AGENTS.md")
        const createExpertToml = generateCreateExpertToml({ provider, model })
        writeFileSync(perstackTomlPath, createExpertToml)
        console.log("✓ Created perstack.toml with create-expert Expert")
      } else {
        const provider = wizardResult.provider || "anthropic"
        const model = wizardResult.model || getDefaultModel(provider)
        const agentsMd = generateAgentsMd({
          provider,
          model,
          runtime: wizardResult.runtime,
        })
        writeFileSync(agentsMdPath, agentsMd)
        console.log("✓ Created AGENTS.md")
        const createExpertToml = generateCreateExpertToml({
          provider,
          model,
          runtime: wizardResult.runtime,
        })
        writeFileSync(perstackTomlPath, createExpertToml)
        console.log("✓ Created perstack.toml with create-expert Expert")
      }
    }
    const expertDescription = wizardResult.expertDescription || ""
    const query = isImprovement
      ? `Improve the Expert "${expertName}": ${expertDescription}`
      : `Create a new Expert based on these requirements: ${expertDescription}`
    const runtimeArg = isDefaultRuntime ? [] : ["--runtime", wizardResult.runtime]
    const args = ["perstack", "start", "create-expert", query, ...runtimeArg]
    const proc = spawn("npx", args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    })
    proc.on("exit", (code) => {
      process.exit(code || 0)
    })
  })

program.parse()
