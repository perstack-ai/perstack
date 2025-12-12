import { describe, expect, it } from "vitest"
import { generateComposeFile } from "./compose-generator.js"

describe("generateComposeFile", () => {
  it("should generate basic compose file", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      runtimeImageName: "perstack-runtime-my-expert:latest",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: [],
    })
    expect(compose).toContain("services:")
    expect(compose).toContain("runtime:")
    expect(compose).toContain("perstack-runtime-my-expert:latest")
    expect(compose).toContain("networks:")
    expect(compose).toContain("perstack-net:")
  })

  it("should include environment variables", () => {
    const compose = generateComposeFile({
      expertKey: "my-expert",
      runtimeImageName: "perstack-runtime-my-expert:latest",
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
      runtimeImageName: "perstack-runtime-my-expert:latest",
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
      runtimeImageName: "perstack-runtime-my-expert:latest",
      proxyEnabled: false,
      networkName: "perstack-net",
      envKeys: [],
      workspacePath: "./workspace",
    })
    expect(compose).toContain("volumes:")
    expect(compose).toContain("./workspace:/workspace:rw")
    expect(compose).toContain("working_dir: /workspace")
  })
})
