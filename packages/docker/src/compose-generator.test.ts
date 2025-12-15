import { describe, expect, it } from "vitest"
import { generateBuildContext, generateComposeFile } from "./compose-generator.js"

describe("generateComposeFile", () => {
  it("should generate basic compose file", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: [],
    })
    expect(compose).toContain("services:")
    expect(compose).toContain("runtime:")
    expect(compose).toContain("build:")
    expect(compose).toContain("dockerfile: Dockerfile")
    expect(compose).toContain("networks:")
    expect(compose).toContain("perstack-net:")
  })
  it("should include environment variables", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: ["ANTHROPIC_API_KEY", "GH_TOKEN"],
    })
    expect(compose).toContain("environment:")
    expect(compose).toContain("- ANTHROPIC_API_KEY")
    expect(compose).toContain("- GH_TOKEN")
  })
  it("should include proxy service when enabled", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: true,
      networkName: "perstack-net",
      envKeys: [],
    })
    expect(compose).toContain("proxy:")
    expect(compose).toContain("depends_on:")
    expect(compose).toContain("HTTP_PROXY")
    expect(compose).toContain("HTTPS_PROXY")
  })
  it("should include workspace volume when specified", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: [],
      workspacePath: "./workspace",
    })
    expect(compose).toContain("volumes:")
    expect(compose).toContain("./workspace:/workspace:rw")
    expect(compose).not.toContain("working_dir:")
  })
  it("should merge env keys with proxy env in single environment block", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: true,
      networkName: "perstack-net",
      envKeys: ["ANTHROPIC_API_KEY"],
    })
    const envMatches = compose.match(/environment:/g)
    expect(envMatches).toHaveLength(1)
    expect(compose).toContain("- ANTHROPIC_API_KEY")
    expect(compose).toContain("- HTTP_PROXY")
  })
  it("should include absolute workspace path when specified", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: [],
      workspacePath: "/path/to/my/project",
    })
    expect(compose).toContain("volumes:")
    expect(compose).toContain("/path/to/my/project:/workspace:rw")
    expect(compose).not.toContain("working_dir:")
  })
})
describe("generateBuildContext", () => {
  const minimalConfig = {
    model: "test-model",
    provider: { providerName: "anthropic" as const },
    experts: {
      "test-expert": {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        description: "Test expert",
        instruction: "You are a test expert",
        skills: {},
        delegates: [],
        tags: [],
      },
    },
  }
  it("should use default workspace path when not provided", () => {
    const context = generateBuildContext(minimalConfig, "test-expert")
    expect(context.composeFile).toContain("./workspace:/workspace:rw")
  })
  it("should use provided workspace path", () => {
    const context = generateBuildContext(minimalConfig, "test-expert", "/custom/path")
    expect(context.composeFile).toContain("/custom/path:/workspace:rw")
  })
})
