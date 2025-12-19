import { describe, expect, it } from "vitest"
import { parseBuildOutputLine, parseProxyLogLine } from "./output-parser.js"

describe("parseProxyLogLine", () => {
  it.each([
    {
      name: "allowed CONNECT with TCP_TUNNEL",
      input: "proxy-1  | 1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443",
      expected: { action: "allowed", domain: "api.anthropic.com", port: 443 },
    },
    {
      name: "allowed CONNECT with HIER_DIRECT",
      input: "proxy-1  | 1734567890.123 HIER_DIRECT/200 CONNECT api.openai.com:443",
      expected: { action: "allowed", domain: "api.openai.com", port: 443 },
    },
    {
      name: "blocked CONNECT request",
      input: "proxy-1  | 1734567890.123 TCP_DENIED/403 CONNECT blocked.com:443",
      expected: {
        action: "blocked",
        domain: "blocked.com",
        port: 443,
        reason: "Domain not in allowlist",
      },
    },
    {
      name: "log line without container prefix",
      input: "1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443",
      expected: { action: "allowed", domain: "api.anthropic.com", port: 443 },
    },
    {
      name: "blocked with /403 status",
      input: "1734567890.123 HIER_NONE/403 CONNECT evil.com:443",
      expected: {
        action: "blocked",
        domain: "evil.com",
        port: 443,
        reason: "Domain not in allowlist",
      },
    },
  ])("should parse $name", ({ input, expected }) => {
    expect(parseProxyLogLine(input)).toEqual(expected)
  })

  it.each([
    {
      name: "non-CONNECT requests",
      input: "proxy-1  | 1734567890.123 TCP_MISS/200 GET http://example.com/",
    },
    { name: "unrecognized log format", input: "some random log line" },
  ])("should return null for $name", ({ input }) => {
    expect(parseProxyLogLine(input)).toBeNull()
  })
})

describe("parseBuildOutputLine", () => {
  it.each([
    {
      name: "standard build output as building stage",
      input: "Step 1/5 : FROM node:22-slim",
      expected: {
        stage: "building",
        service: "runtime",
        message: "Step 1/5 : FROM node:22-slim",
      },
    },
    {
      name: "pulling stage from 'Pulling'",
      input: "Pulling from library/node",
      expected: { stage: "pulling", service: "runtime", message: "Pulling from library/node" },
    },
    {
      name: "pulling stage from 'pull'",
      input: "digest: sha256:abc123 pull complete",
      expected: {
        stage: "pulling",
        service: "runtime",
        message: "digest: sha256:abc123 pull complete",
      },
    },
    {
      name: "buildkit format with runtime service",
      input: "#5 [runtime 1/5] FROM node:22-slim",
      expected: {
        stage: "building",
        service: "runtime",
        message: "#5 [runtime 1/5] FROM node:22-slim",
      },
    },
    {
      name: "buildkit format with proxy service",
      input: "#3 [proxy 2/3] RUN apt-get update",
      expected: {
        stage: "building",
        service: "proxy",
        message: "#3 [proxy 2/3] RUN apt-get update",
      },
    },
    {
      name: "npm install output",
      input: "added 150 packages in 10s",
      expected: { stage: "building", service: "runtime", message: "added 150 packages in 10s" },
    },
  ])("should parse $name", ({ input, expected }) => {
    expect(parseBuildOutputLine(input)).toEqual(expected)
  })

  it.each([
    { name: "empty line", input: "" },
    { name: "whitespace-only line", input: "   " },
  ])("should return null for $name", ({ input }) => {
    expect(parseBuildOutputLine(input)).toBeNull()
  })
})
