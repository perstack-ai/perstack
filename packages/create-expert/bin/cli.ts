#!/usr/bin/env node
import { spawn } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { type PerstackEvent, renderProgress } from "@perstack/tui"
import { Command } from "commander"
import { config } from "dotenv"
import { render } from "ink"
import React from "react"
import type { LLMProvider, WizardResult } from "../src/index.js"
import {
  detectAllLLMs,
  detectAllRuntimes,
  generateAgentsMd,
  generateCreateExpertToml,
  getDefaultModel,
  Wizard,
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

function parseJsonLines(buffer: string, onEvent: (event: Record<string, unknown>) => void): string {
  const lines = buffer.split("\n")
  const remaining = lines.pop() || ""
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === "object") {
        onEvent(parsed)
      }
    } catch {
      // Not JSON, ignore
    }
  }
  return remaining
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
    let wizardResult: WizardResult | undefined
    await new Promise<void>((resolve) => {
      const { waitUntilExit } = render(
        React.createElement(Wizard, {
          llms,
          runtimes,
          isImprovement,
          improvementTarget,
          onComplete: (result: WizardResult) => {
            wizardResult = result
          },
        }),
      )
      waitUntilExit().then(() => resolve())
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
        if (!existing.includes(envVarName)) {
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
    let model = "claude-sonnet-4-5"
    let provider: LLMProvider = "anthropic"
    if (!isImprovement) {
      if (isDefaultRuntime) {
        provider = wizardResult.provider || "anthropic"
        model = wizardResult.model || getDefaultModel(provider)
        const agentsMd = generateAgentsMd({ provider, model })
        writeFileSync(agentsMdPath, agentsMd)
        console.log("✓ Created AGENTS.md")
        const createExpertToml = generateCreateExpertToml({ provider, model })
        writeFileSync(perstackTomlPath, createExpertToml)
        console.log("✓ Created perstack.toml with create-expert Expert")
      } else {
        const agentsMd = generateAgentsMd({
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          runtime: wizardResult.runtime,
        })
        writeFileSync(agentsMdPath, agentsMd)
        console.log("✓ Created AGENTS.md")
        const createExpertToml = generateCreateExpertToml({
          provider: "anthropic",
          model: "claude-sonnet-4-5",
        })
        writeFileSync(perstackTomlPath, createExpertToml)
        console.log("✓ Created perstack.toml with create-expert Expert")
      }
    }
    const expertDescription = wizardResult.expertDescription || ""
    const query = isImprovement
      ? `Improve the Expert "${expertName}": ${expertDescription}`
      : `Create a new Expert based on these requirements: ${expertDescription}`
    console.log("\n🚀 Starting Expert creation...\n")
    const runtimeArg = isDefaultRuntime ? [] : ["--runtime", wizardResult.runtime]
    const args = ["perstack", "run", "create-expert", query, ...runtimeArg]
    const progressHandle = renderProgress({
      title: "🚀 Expert Creation Progress",
    })
    const proc = spawn("npx", args, {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    })
    let buffer = ""
    proc.stdout?.on("data", (data: Buffer) => {
      buffer = parseJsonLines(buffer + data.toString(), (event) => {
        progressHandle.emit(event as unknown as PerstackEvent)
      })
    })
    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trim()
      if (text) {
        console.error(text)
      }
    })
    proc.on("exit", async (code) => {
      await progressHandle.waitUntilExit()
      if (code === 0) {
        console.log("\n✓ Expert creation complete!")
        console.log("\nTo run your Expert:")
        console.log("  perstack start")
        console.log("\nTo run in headless mode:")
        console.log('  perstack run <expert-name> "<query>"')
      } else {
        console.error(`\nExpert creation failed with code ${code}`)
        process.exit(code || 1)
      }
    })
  })

program.parse()
