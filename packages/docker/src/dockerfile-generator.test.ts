import type { PerstackConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  collectNpmPackages,
  detectRequiredRuntimes,
  generateBaseImageLayers,
  generateDockerfile,
  generateRuntimeInstallLayers,
} from "./dockerfile-generator.js"

describe("detectRequiredRuntimes", () => {
  it("should always include nodejs", () => {
    const config: PerstackConfig = {}
    const runtimes = detectRequiredRuntimes(config, "non-existent")
    expect(runtimes.has("nodejs")).toBe(true)
  })

  it("should detect nodejs from npx command", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            "test-skill": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "test-package",
            },
          },
        },
      },
    }
    const runtimes = detectRequiredRuntimes(config, "test-expert")
    expect(runtimes.has("nodejs")).toBe(true)
  })

  it("should detect python from uvx command", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            "test-skill": {
              type: "mcpStdioSkill",
              command: "uvx",
              packageName: "test-package",
            },
          },
        },
      },
    }
    const runtimes = detectRequiredRuntimes(config, "test-expert")
    expect(runtimes.has("python")).toBe(true)
  })

  it("should detect both runtimes when mixed in same expert", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            "node-skill": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "node-package",
            },
            "python-skill": {
              type: "mcpStdioSkill",
              command: "python3",
              packageName: "python-package",
            },
          },
        },
      },
    }
    const runtimes = detectRequiredRuntimes(config, "test-expert")
    expect(runtimes.has("nodejs")).toBe(true)
    expect(runtimes.has("python")).toBe(true)
  })

  it("should only detect runtimes for the specified expert", () => {
    const config: PerstackConfig = {
      experts: {
        "node-only-expert": {
          instruction: "test",
          skills: {
            "node-skill": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "node-package",
            },
          },
        },
        "python-expert": {
          instruction: "test",
          skills: {
            "python-skill": {
              type: "mcpStdioSkill",
              command: "uvx",
              packageName: "python-package",
            },
          },
        },
      },
    }
    const nodeOnlyRuntimes = detectRequiredRuntimes(config, "node-only-expert")
    expect(nodeOnlyRuntimes.has("nodejs")).toBe(true)
    expect(nodeOnlyRuntimes.has("python")).toBe(false)
    const pythonRuntimes = detectRequiredRuntimes(config, "python-expert")
    expect(pythonRuntimes.has("nodejs")).toBe(true)
    expect(pythonRuntimes.has("python")).toBe(true)
  })
})

describe("generateBaseImageLayers", () => {
  it("should use official node image as base", () => {
    const runtimes = new Set<"nodejs" | "python">(["nodejs"])
    const layers = generateBaseImageLayers(runtimes)
    expect(layers).toContain("FROM node:22-bookworm-slim")
  })

  it("should include python installation when required", () => {
    const runtimes = new Set<"nodejs" | "python">(["python"])
    const layers = generateBaseImageLayers(runtimes)
    expect(layers).toContain("python3")
    expect(layers).toContain("uv")
  })
})

describe("collectNpmPackages", () => {
  it("should collect npm packages from npx skills", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            "@perstack/base": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "@perstack/base",
            },
          },
        },
      },
    }
    const packages = collectNpmPackages(config, "test-expert")
    expect(packages).toContain("@perstack/base")
  })

  it("should return empty array when no skills", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
        },
      },
    }
    const packages = collectNpmPackages(config, "test-expert")
    expect(packages).toEqual([])
  })
})

describe("generateRuntimeInstallLayers", () => {
  it("should generate npm install for runtime packages", () => {
    const layers = generateRuntimeInstallLayers()
    expect(layers).toContain("npm install -g @perstack/runtime @perstack/base")
  })
})

describe("generateDockerfile", () => {
  it("should generate complete dockerfile", () => {
    const config: PerstackConfig = {
      experts: {
        "my-expert": {
          instruction: "test",
          skills: {
            "@perstack/base": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "@perstack/base",
            },
          },
        },
      },
    }
    const dockerfile = generateDockerfile(config, "my-expert")
    expect(dockerfile).toContain("FROM node:22-bookworm-slim")
    expect(dockerfile).toContain("npm install -g @perstack/runtime @perstack/base")
    expect(dockerfile).toContain("COPY --chown=perstack:perstack perstack.toml /app/perstack.toml")
    expect(dockerfile).toContain("USER perstack")
    expect(dockerfile).toContain(
      'ENTRYPOINT ["perstack-runtime", "run", "--config", "/app/perstack.toml", "my-expert"]',
    )
  })

  it("should not install skill packages at build time", () => {
    const config: PerstackConfig = {
      experts: {
        "my-expert": {
          instruction: "test",
          skills: {
            "custom-skill": {
              type: "mcpStdioSkill",
              command: "npx",
              packageName: "@my-org/private-mcp-server",
            },
          },
        },
      },
    }
    const dockerfile = generateDockerfile(config, "my-expert")
    // Skill packages should NOT be installed at build time
    // They are installed at runtime via npx
    expect(dockerfile).not.toContain("@my-org/private-mcp-server")
  })
})
