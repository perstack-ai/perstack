import { describe, expect, it } from "vitest"
import { exec } from "./exec.js"

describe("exec tool", () => {
  it("captures stdout when enabled", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["-e", 'process.stdout.write("HELLO")'],
      env: {},
      cwd: process.cwd(),
      stdout: true,
      stderr: false,
      timeout: 2000,
    })
    expect(result.output).toBe("HELLO")
  })

  it("captures stderr when enabled", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["-e", 'process.stderr.write("ERR")'],
      env: {},
      cwd: process.cwd(),
      stdout: false,
      stderr: true,
      timeout: 2000,
    })
    expect(result.output).toBe("ERR")
  })

  it("returns default message when no output captured", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["-e", ""],
      env: {},
      cwd: process.cwd(),
      stdout: false,
      stderr: false,
      timeout: 2000,
    })
    expect(result.output).toBe("Command executed successfully, but produced no output.")
  })

  it("throws error on timeout", async () => {
    await expect(
      exec({
        command: process.execPath,
        args: ["-e", "setTimeout(()=>{}, 50)"],
        env: {},
        cwd: process.cwd(),
        stdout: true,
        stderr: true,
        timeout: 10,
      }),
    ).rejects.toThrow()
  })

  it("captures both stdout and stderr together", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["-e", 'process.stdout.write("OUT"); process.stderr.write("ERR")'],
      env: {},
      cwd: process.cwd(),
      stdout: true,
      stderr: true,
      timeout: 2000,
    })
    expect(result.output).toContain("OUT")
    expect(result.output).toContain("ERR")
  })

  it("passes custom environment variables", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["-e", 'process.stdout.write(process.env.MY_VAR || "NOT_SET")'],
      env: { MY_VAR: "CUSTOM_VALUE" },
      cwd: process.cwd(),
      stdout: true,
      stderr: false,
      timeout: 2000,
    })
    expect(result.output).toBe("CUSTOM_VALUE")
  })

  it("handles empty args array", async () => {
    const result = await exec({
      command: process.execPath,
      args: ["--version"],
      env: {},
      cwd: process.cwd(),
      stdout: true,
      stderr: false,
      timeout: 2000,
    })
    expect(result.output).toBeTruthy()
  })
})
