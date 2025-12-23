/**
 * Generates API documentation from OpenAPI specification.
 *
 * Output structure:
 *   docs/api-reference/[product]-[version]/[resource].md
 *   e.g., docs/api-reference/studio-v1/experts.md
 *
 * Usage:
 *   npx tsx scripts/generate-api-docs.ts
 *   npx tsx scripts/generate-api-docs.ts --output ./docs/api-reference
 *   npx tsx scripts/generate-api-docs.ts --url http://localhost:3000/openapi.json
 *   npx tsx scripts/generate-api-docs.ts --save-spec
 *   npx tsx scripts/generate-api-docs.ts --save-spec packages/api-client/openapi.json
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    description: string
    version: string
  }
  paths: Record<string, PathItem>
}

interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  patch?: Operation
  delete?: Operation
}

interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses?: Record<string, Response>
}

interface Parameter {
  name: string
  in: "path" | "query" | "header" | "cookie"
  required?: boolean
  description?: string
  schema?: Schema
}

interface RequestBody {
  description?: string
  required?: boolean
  content?: Record<string, MediaType>
}

interface Response {
  description?: string
  content?: Record<string, MediaType>
}

interface MediaType {
  schema?: Schema
}

interface Schema {
  type?: string
  const?: unknown
  enum?: unknown[]
  description?: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  anyOf?: Schema[]
  allOf?: Schema[]
  oneOf?: Schema[]
  patternProperties?: Record<string, Schema>
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  minimum?: number
  maximum?: number
  format?: string
  default?: unknown
  examples?: unknown[]
  source?: string
  flags?: string
  discriminantKey?: string
}

interface ParsedPath {
  product: string
  version: string
  resource: string
  subResource?: string
  fullPath: string
}

async function fetchOpenAPISpec(url: string): Promise<OpenAPISpec> {
  if (url.startsWith("file://") || url.startsWith("/") || url.match(/^[A-Za-z]:\\/)) {
    const filePath = url.startsWith("file://") ? url.slice(7) : url
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as OpenAPISpec
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`)
  }
  return response.json() as Promise<OpenAPISpec>
}

function parsePath(apiPath: string): ParsedPath | null {
  const match = apiPath.match(/^\/api\/([^/]+)\/([^/]+)\/([^/]+)/)
  if (!match) return null

  const [, product, version, resource] = match
  const remaining = apiPath.slice(match[0].length)
  const subResourceMatch = remaining.match(/^\/\{[^}]+\}\/([^/]+)/)
  const subResource = subResourceMatch ? subResourceMatch[1] : undefined

  return {
    product,
    version,
    resource: resource.replace(/_/g, "-"),
    subResource: subResource?.replace(/_/g, "-"),
    fullPath: apiPath,
  }
}

function getResourceKey(parsed: ParsedPath): string {
  if (parsed.subResource) {
    return `${parsed.product}-${parsed.version}/${parsed.resource}-${parsed.subResource}`
  }
  return `${parsed.product}-${parsed.version}/${parsed.resource}`
}

function formatSchema(schema: Schema, indent = 0): string {
  const pad = "  ".repeat(indent)
  const lines: string[] = []

  if (schema.description) {
    lines.push(`${pad}**Description:** ${schema.description}`)
  }

  if (schema.type === "RegExp" && schema.source) {
    lines.push(`${pad}**Type:** string (pattern)`)
    lines.push(`${pad}**Pattern:** \`${schema.source}\``)
  } else if (schema.const !== undefined) {
    lines.push(`${pad}**Type:** constant`)
    lines.push(`${pad}**Value:** \`${JSON.stringify(schema.const)}\``)
  } else if (schema.enum) {
    lines.push(`${pad}**Type:** enum`)
    lines.push(`${pad}**Values:** ${schema.enum.map((v) => `\`${v}\``).join(", ")}`)
  } else if (schema.type) {
    lines.push(`${pad}**Type:** ${schema.type}`)
  }

  if (schema.format) {
    lines.push(`${pad}**Format:** ${schema.format}`)
  }

  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    const constraints: string[] = []
    if (schema.minLength !== undefined) constraints.push(`min: ${schema.minLength}`)
    if (schema.maxLength !== undefined) constraints.push(`max: ${schema.maxLength}`)
    lines.push(`${pad}**Length:** ${constraints.join(", ")}`)
  }

  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    const constraints: string[] = []
    if (schema.minItems !== undefined) constraints.push(`min: ${schema.minItems}`)
    if (schema.maxItems !== undefined) constraints.push(`max: ${schema.maxItems}`)
    lines.push(`${pad}**Items:** ${constraints.join(", ")}`)
  }

  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    const constraints: string[] = []
    if (schema.minimum !== undefined) constraints.push(`min: ${schema.minimum}`)
    if (schema.maximum !== undefined) constraints.push(`max: ${schema.maximum}`)
    lines.push(`${pad}**Range:** ${constraints.join(", ")}`)
  }

  if (schema.default !== undefined) {
    lines.push(`${pad}**Default:** \`${JSON.stringify(schema.default)}\``)
  }

  if (schema.examples && schema.examples.length > 0) {
    lines.push(`${pad}**Examples:** ${schema.examples.map((e) => `\`${e}\``).join(", ")}`)
  }

  return lines.join("\n")
}

function formatSchemaAsTable(schema: Schema, depth = 0): string {
  if (!schema.properties) return ""

  const lines: string[] = []
  const required = schema.required ?? []

  if (depth === 0) {
    lines.push("| Property | Type | Required | Description |")
    lines.push("|----------|------|----------|-------------|")
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    const isRequired = required.includes(name)
    let typeStr = prop.type ?? "unknown"

    if (prop.type === "RegExp" && prop.source) {
      typeStr = `string (pattern: \`${prop.source.slice(0, 30)}${prop.source.length > 30 ? "..." : ""}\`)`
    } else if (prop.const !== undefined) {
      typeStr = `\`${JSON.stringify(prop.const)}\``
    } else if (prop.enum) {
      typeStr = prop.enum.map((v) => `\`${v}\``).join(" \\| ")
    } else if (prop.type === "array" && prop.items) {
      const itemType = prop.items.type ?? "unknown"
      typeStr = `${itemType}[]`
    } else if (prop.anyOf) {
      typeStr = "union"
    }

    const desc = prop.description ?? ""
    const prefix = "  ".repeat(depth)
    lines.push(`| ${prefix}${name} | ${typeStr} | ${isRequired ? "Yes" : "No"} | ${desc} |`)

    if (prop.properties) {
      lines.push(formatSchemaAsTable(prop, depth + 1))
    }
  }

  return lines.join("\n")
}

function formatParameter(param: Parameter): string {
  const lines: string[] = []
  lines.push(`#### \`${param.name}\` (${param.in})`)
  lines.push("")

  if (param.required) {
    lines.push("**Required**")
    lines.push("")
  }

  if (param.description) {
    lines.push(param.description)
    lines.push("")
  }

  if (param.schema) {
    lines.push(formatSchema(param.schema))
    lines.push("")
  }

  return lines.join("\n")
}

function formatRequestBody(body: RequestBody): string {
  const lines: string[] = []
  lines.push("### Request Body")
  lines.push("")

  if (body.description) {
    lines.push(body.description)
    lines.push("")
  }

  if (body.required) {
    lines.push("**Required**")
    lines.push("")
  }

  if (body.content) {
    for (const [contentType, media] of Object.entries(body.content)) {
      if (contentType !== "application/json") continue
      lines.push(`**Content-Type:** \`${contentType}\``)
      lines.push("")

      if (media.schema) {
        const table = formatSchemaAsTable(media.schema)
        if (table) {
          lines.push(table)
          lines.push("")
        }
      }
    }
  }

  return lines.join("\n")
}

function formatResponse(statusCode: string, response: Response): string {
  const lines: string[] = []
  lines.push(`#### ${statusCode}`)
  lines.push("")

  if (response.description) {
    lines.push(response.description)
    lines.push("")
  }

  if (response.content) {
    for (const [contentType, media] of Object.entries(response.content)) {
      lines.push(`**Content-Type:** \`${contentType}\``)
      lines.push("")

      if (media.schema) {
        const table = formatSchemaAsTable(media.schema)
        if (table) {
          lines.push(table)
          lines.push("")
        }
      }
    }
  }

  return lines.join("\n")
}

function formatOperation(method: string, apiPath: string, operation: Operation): string {
  const lines: string[] = []

  lines.push(`## ${method.toUpperCase()} \`${apiPath}\``)
  lines.push("")

  if (operation.summary) {
    lines.push(`**${operation.summary}**`)
    lines.push("")
  }

  if (operation.description) {
    lines.push(operation.description)
    lines.push("")
  }

  if (operation.operationId) {
    lines.push(`**Operation ID:** \`${operation.operationId}\``)
    lines.push("")
  }

  if (operation.parameters && operation.parameters.length > 0) {
    lines.push("### Parameters")
    lines.push("")
    for (const param of operation.parameters) {
      lines.push(formatParameter(param))
    }
  }

  if (operation.requestBody) {
    lines.push(formatRequestBody(operation.requestBody))
  }

  if (operation.responses) {
    lines.push("### Responses")
    lines.push("")
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      lines.push(formatResponse(statusCode, response))
    }
  }

  lines.push("---")
  lines.push("")

  return lines.join("\n")
}

type EndpointInfo = { method: string; path: string; operation: Operation }

function groupEndpointsByResource(
  spec: OpenAPISpec,
): Map<string, { parsed: ParsedPath; endpoints: EndpointInfo[] }> {
  const groups = new Map<string, { parsed: ParsedPath; endpoints: EndpointInfo[] }>()

  for (const [apiPath, pathItem] of Object.entries(spec.paths)) {
    const methods: Array<[string, Operation | undefined]> = [
      ["get", pathItem.get],
      ["post", pathItem.post],
      ["put", pathItem.put],
      ["patch", pathItem.patch],
      ["delete", pathItem.delete],
    ]

    for (const [method, operation] of methods) {
      if (!operation) continue

      const parsed = parsePath(apiPath)
      if (!parsed) continue

      const key = getResourceKey(parsed)
      if (!groups.has(key)) {
        groups.set(key, { parsed, endpoints: [] })
      }
      groups.get(key)?.endpoints.push({ method, path: apiPath, operation })
    }
  }

  return groups
}

function generateResourceMarkdown(parsed: ParsedPath, endpoints: EndpointInfo[]): string {
  const lines: string[] = []

  const title = parsed.subResource
    ? `${capitalize(parsed.resource)} ${capitalize(parsed.subResource)}`
    : capitalize(parsed.resource)

  lines.push("---")
  lines.push(`title: "${title} API"`)
  lines.push("---")
  lines.push("")
  lines.push(`# ${title}`)
  lines.push("")
  lines.push(`**Product:** ${parsed.product}`)
  lines.push(`**Version:** ${parsed.version}`)
  lines.push("")

  lines.push("## Endpoints")
  lines.push("")
  for (const { method, path: apiPath } of endpoints) {
    const anchor = `${method}-${apiPath}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    lines.push(`- [${method.toUpperCase()} \`${apiPath}\`](#${anchor})`)
  }
  lines.push("")

  for (const { method, path: apiPath, operation } of endpoints) {
    lines.push(formatOperation(method, apiPath, operation))
  }

  return lines.join("\n")
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function printStats(spec: OpenAPISpec): void {
  const groups = groupEndpointsByResource(spec)
  let totalEndpoints = 0

  console.log("\n=== OpenAPI Spec Statistics ===\n")
  console.log(`Title: ${spec.info.title}`)
  console.log(`Version: ${spec.info.version}`)
  console.log(`OpenAPI: ${spec.openapi}`)
  console.log("")
  console.log("Resources:")
  console.log("----------")

  for (const [key, { endpoints }] of groups) {
    console.log(`  ${key}: ${endpoints.length} endpoints`)
    totalEndpoints += endpoints.length

    for (const { method, path: apiPath } of endpoints) {
      console.log(`    ${method.toUpperCase().padEnd(7)} ${apiPath}`)
    }
  }

  console.log("")
  console.log(`Total: ${totalEndpoints} endpoints across ${groups.size} resources`)
  console.log("")
}

async function writeDocumentation(spec: OpenAPISpec, outputDir: string): Promise<void> {
  const groups = groupEndpointsByResource(spec)

  await fs.mkdir(outputDir, { recursive: true })

  const writtenFiles: string[] = []

  for (const [key, { parsed, endpoints }] of groups) {
    const filePath = path.join(outputDir, `${key}.md`)
    const dir = path.dirname(filePath)

    await fs.mkdir(dir, { recursive: true })

    const content = generateResourceMarkdown(parsed, endpoints)
    await fs.writeFile(filePath, content, "utf-8")
    writtenFiles.push(filePath)
  }

  console.log(`\nWritten ${writtenFiles.length} files:`)
  for (const file of writtenFiles) {
    console.log(`  ${file}`)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  let url = "http://localhost:3000/openapi.json"
  let outputDir: string | undefined
  let statsOnly = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      url = args[i + 1]
      i++
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[i + 1]
      i++
    } else if (args[i] === "--stats") {
      statsOnly = true
    }
  }

  console.log(`Fetching OpenAPI spec from: ${url}`)

  try {
    const spec = await fetchOpenAPISpec(url)

    printStats(spec)

    if (!statsOnly && outputDir) {
      await writeDocumentation(spec, outputDir)
    } else if (!statsOnly) {
      console.log("Use --output <dir> to write documentation files")
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
