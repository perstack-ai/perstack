import type {
  AdapterRunParams,
  AdapterRunResult,
  Expert,
  PrerequisiteResult,
  RuntimeAdapter,
  RuntimeExpertConfig,
} from "@perstack/core"
import { BaseAdapter } from "@perstack/core"

export class DockerAdapter extends BaseAdapter implements RuntimeAdapter {
  readonly name = "docker"
  protected version = "0.0.1"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    try {
      const result = await this.execCommand(["docker", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Docker CLI is not installed or not in PATH.",
            helpUrl: "https://docs.docker.com/get-docker/",
          },
        }
      }
      const versionMatch = result.stdout.match(/Docker version ([\d.]+)/)
      this.version = versionMatch?.[1] ?? "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Docker CLI is not installed or not in PATH.",
          helpUrl: "https://docs.docker.com/get-docker/",
        },
      }
    }
    try {
      const pingResult = await this.execCommand(["docker", "info"])
      if (pingResult.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Docker daemon is not running.",
            helpUrl: "https://docs.docker.com/config/daemon/start/",
          },
        }
      }
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Docker daemon is not running.",
          helpUrl: "https://docs.docker.com/config/daemon/start/",
        },
      }
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(_params: AdapterRunParams): Promise<AdapterRunResult> {
    throw new Error("DockerAdapter.run() is not yet implemented")
  }
}
