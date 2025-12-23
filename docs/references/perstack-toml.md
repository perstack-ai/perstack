---
title: "perstack.toml Reference"
---

# perstack.toml Reference

- [Complete Example](#complete-example)
- [Runtime Configuration](#runtime-configuration)
- [Expert Definition](#expert-definition)
- [Skill Definition](#skill-definition)

## Complete Example

```toml
# Runtime configuration
model = "claude-sonnet-4-5"
reasoningBudget = "medium"
runtime = "docker"
maxSteps = 50
maxRetries = 3
timeout = 60000
envPath = [".env", ".env.local"]

[provider]
providerName = "anthropic"
[provider.setting]
headers = { "X-Custom-Header" = "value" }

# Expert definition
[experts."my-expert"]
version = "1.0.0"
description = "TypeScript and React code reviewer with security analysis"
instruction = """
You are a code reviewer specializing in TypeScript and React.
Review code for type safety, performance, accessibility, and security.
Provide constructive feedback with specific examples.
"""
delegates = ["@org/security-expert", "performance-analyzer"]

# Base skill (optional)
[experts."my-expert".skills."@perstack/base"]
type = "mcpStdioSkill"
description = "Base filesystem and shell tools"
command = "npx"
packageName = "@perstack/base"

# MCP Stdio skill
[experts."my-expert".skills."web-search"]
type = "mcpStdioSkill"
description = "Search the web for documentation and best practices"
rule = "Use for finding up-to-date documentation and security advisories"
command = "npx"
packageName = "exa-mcp-server"
pick = ["web_search_exa"]
requiredEnv = ["EXA_API_KEY"]

# MCP SSE skill
[experts."my-expert".skills."static-analyzer"]
type = "mcpSseSkill"
description = "Remote static analysis service"
endpoint = "https://api.example.com/static-analysis"
pick = ["analyze_typescript"]
omit = ["analyze_python"]

# Interactive skill
[experts."my-expert".skills."user-interaction"]
type = "interactiveSkill"
description = "Interactive tools for user feedback"
rule = "Use when clarification is needed from the user"

[experts."my-expert".skills."user-interaction".tools."askUser"]
description = "Ask user for input or clarification"
inputJsonSchema = """
{
  "type": "object",
  "properties": {
    "question": {
      "type": "string",
      "description": "Question to ask the user"
    }
  },
  "required": ["question"]
}
"""
```

## Runtime Configuration

Top-level settings that apply to all Experts in the file.

```toml
model = "claude-sonnet-4-5"
reasoningBudget = "medium"
runtime = "docker"
maxSteps = 100
maxRetries = 10
timeout = 60000

[provider]
providerName = "anthropic"
[provider.setting]
baseUrl = "https://custom-endpoint.example.com"
headers = { "X-Custom-Header" = "value" }
```

| Field             | Type             | Description                                                                      |
| ----------------- | ---------------- | -------------------------------------------------------------------------------- |
| `model`           | string           | Model name                                                                       |
| `reasoningBudget` | string or number | Native LLM reasoning budget (`minimal`, `low`, `medium`, `high`, or token count) |
| `runtime`         | string           | Execution runtime (`docker`, `local`, `cursor`, `claude-code`, `gemini`)         |
| `maxSteps`        | number           | Maximum steps per run                                                            |
| `maxRetries`      | number           | Maximum retry attempts                                                           |
| `timeout`         | number           | Timeout per generation (ms)                                                      |

### Provider Configuration

Configure LLM provider under `[provider]` table.

```toml
[provider]
providerName = "anthropic"  # Required: anthropic, google, openai, ollama, azure-openai, amazon-bedrock, google-vertex
[provider.setting]
# Provider-specific options (all optional)
```

| Field          | Type   | Description                           |
| -------------- | ------ | ------------------------------------- |
| `providerName` | string | LLM provider name (required)          |
| `setting`      | object | Provider-specific settings (optional) |

#### Provider Settings by Provider

**Anthropic** (`providerName = "anthropic"`)

| Setting   | Type   | Description         |
| --------- | ------ | ------------------- |
| `baseUrl` | string | Custom API endpoint |
| `headers` | object | Custom HTTP headers |

**Google** (`providerName = "google"`)

| Setting   | Type   | Description         |
| --------- | ------ | ------------------- |
| `baseUrl` | string | Custom API endpoint |
| `headers` | object | Custom HTTP headers |

**OpenAI** (`providerName = "openai"`)

| Setting        | Type   | Description            |
| -------------- | ------ | ---------------------- |
| `baseUrl`      | string | Custom API endpoint    |
| `organization` | string | OpenAI organization ID |
| `project`      | string | OpenAI project ID      |
| `name`         | string | Custom provider name   |
| `headers`      | object | Custom HTTP headers    |

**Ollama** (`providerName = "ollama"`)

| Setting   | Type   | Description         |
| --------- | ------ | ------------------- |
| `baseUrl` | string | Ollama server URL   |
| `headers` | object | Custom HTTP headers |

**Azure OpenAI** (`providerName = "azure-openai"`)

| Setting                  | Type    | Description               |
| ------------------------ | ------- | ------------------------- |
| `resourceName`           | string  | Azure resource name       |
| `apiVersion`             | string  | Azure API version         |
| `baseUrl`                | string  | Custom API endpoint       |
| `headers`                | object  | Custom HTTP headers       |
| `useDeploymentBasedUrls` | boolean | Use deployment-based URLs |

**Amazon Bedrock** (`providerName = "amazon-bedrock"`)

| Setting  | Type   | Description |
| -------- | ------ | ----------- |
| `region` | string | AWS region  |

**Google Vertex AI** (`providerName = "google-vertex"`)

| Setting    | Type   | Description                        |
| ---------- | ------ | ---------------------------------- |
| `project`  | string | GCP project ID                     |
| `location` | string | GCP location (e.g., `us-central1`) |
| `baseUrl`  | string | Custom API endpoint                |
| `headers`  | object | Custom HTTP headers                |

**DeepSeek** (`providerName = "deepseek"`)

| Setting   | Type   | Description         |
| --------- | ------ | ------------------- |
| `baseUrl` | string | Custom API endpoint |
| `headers` | object | Custom HTTP headers |

> [!TIP]
> See [Providers and Models](./providers-and-models.md) for available models and environment variables.

## Expert Definition

Define Experts under `[experts."expert-key"]`.

```toml
[experts."my-expert"]
version = "1.0.0"
description = "Brief description of the expert"
instruction = """
Detailed instructions for the expert's behavior.
Can be multi-line.
"""
delegates = ["other-expert", "@org/another-expert"]
```

| Field               | Type     | Required | Description                         |
| ------------------- | -------- | -------- | ----------------------------------- |
| `version`           | string   | No       | Semantic version (default: `1.0.0`) |
| `minRuntimeVersion` | string   | No       | Minimum runtime version             |
| `description`       | string   | No       | Brief description (max 2048 chars)  |
| `instruction`       | string   | **Yes**  | Behavior instructions (max 20KB)    |
| `delegates`         | string[] | No       | Experts this Expert can delegate to |
| `tags`              | string[] | No       | Tags for categorization             |

## Skill Definition

Define skills under `[experts."expert-name".skills."skill-name"]`.

### MCP Stdio Skill

```toml
[experts."my-expert".skills."my-skill"]
type = "mcpStdioSkill"
description = "Skill description"
rule = "Additional usage guidelines"
command = "npx"
packageName = "mcp-server-package"
args = ["-y", "additional-args"]
pick = ["tool1", "tool2"]
omit = ["tool3"]
requiredEnv = ["API_KEY"]
allowedDomains = ["api.example.com", "*.example.com"]
```

| Field            | Type     | Required | Description                                         |
| ---------------- | -------- | -------- | --------------------------------------------------- |
| `type`           | literal  | **Yes**  | `"mcpStdioSkill"`                                   |
| `description`    | string   | No       | Skill description                                   |
| `rule`           | string   | No       | Additional usage guidelines                         |
| `command`        | string   | **Yes**  | Command to execute (`npx`, `python`, `uvx`)         |
| `packageName`    | string   | No       | Package name (for `npx`)                            |
| `args`           | string[] | No       | Command-line arguments                              |
| `pick`           | string[] | No       | Tools to include (whitelist)                        |
| `omit`           | string[] | No       | Tools to exclude (blacklist)                        |
| `requiredEnv`    | string[] | No       | Required environment variables                      |
| `allowedDomains` | string[] | No       | Allowed domains for network access (docker runtime) |

> [!CAUTION]
> Punycode domains (containing `xn--` labels) are rejected to prevent homograph attacks. Only ASCII domains are allowed.

### MCP SSE Skill

```toml
[experts."my-expert".skills."remote-skill"]
type = "mcpSseSkill"
description = "Remote MCP server"
endpoint = "https://api.example.com/mcp"
pick = ["tool1"]
omit = ["tool2"]
allowedDomains = ["api.example.com"]
```

| Field            | Type     | Required | Description                                         |
| ---------------- | -------- | -------- | --------------------------------------------------- |
| `type`           | literal  | **Yes**  | `"mcpSseSkill"`                                     |
| `description`    | string   | No       | Skill description                                   |
| `rule`           | string   | No       | Additional usage guidelines                         |
| `endpoint`       | string   | **Yes**  | MCP server URL                                      |
| `pick`           | string[] | No       | Tools to include                                    |
| `omit`           | string[] | No       | Tools to exclude                                    |
| `allowedDomains` | string[] | No       | Allowed domains for network access (docker runtime) |

> [!CAUTION]
> Punycode domains (containing `xn--` labels) are rejected to prevent homograph attacks. Only ASCII domains are allowed.

### Interactive Skill

```toml
[experts."my-expert".skills."user-interaction"]
type = "interactiveSkill"
description = "User interaction skill"

[experts."my-expert".skills."user-interaction".tools."askUser"]
description = "Ask user for input"
inputJsonSchema = """
{
  "type": "object",
  "properties": {
    "question": { "type": "string" }
  },
  "required": ["question"]
}
"""
```

| Field         | Type    | Required | Description                 |
| ------------- | ------- | -------- | --------------------------- |
| `type`        | literal | **Yes**  | `"interactiveSkill"`        |
| `description` | string  | No       | Skill description           |
| `rule`        | string  | No       | Additional usage guidelines |
| `tools`       | object  | **Yes**  | Tool definitions            |

**Tool definition:**

| Field             | Type   | Required | Description           |
| ----------------- | ------ | -------- | --------------------- |
| `description`     | string | No       | Tool description      |
| `inputJsonSchema` | string | **Yes**  | JSON Schema for input |
