# @perstack/base

Base skills (MCP tools) for Perstack agents.

For detailed documentation, see [Base Skill](https://docs.perstack.ai/making-experts/base-skill).

## Installation

```bash
npm install @perstack/base
```

## Usage

### As MCP Server

Run directly via npx:

```bash
npx @perstack/base
```

### As Library

Import and register tools with your MCP server:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { registerReadTextFile, registerWriteTextFile } from "@perstack/base"

const server = new McpServer({ name: "my-server", version: "1.0.0" })

registerReadTextFile(server)
registerWriteTextFile(server)
```

## Available Tools

### File Operations
- `readTextFile` - Read text files with optional line range
- `writeTextFile` - Create or overwrite text files
- `appendTextFile` - Append content to existing files
- `editTextFile` - Replace text in existing files
- `deleteFile` - Remove files
- `moveFile` - Move or rename files
- `getFileInfo` - Get file metadata
- `readImageFile` - Read image files (PNG, JPEG, GIF, WebP)
- `readPdfFile` - Read PDF files

### Directory Operations
- `listDirectory` - List directory contents
- `createDirectory` - Create directories
- `deleteDirectory` - Remove directories

### Utilities
- `exec` - Execute system commands
- `healthCheck` - Check Perstack runtime health status
- `think` - Sequential thinking for problem analysis
- `todo` - Task list management
- `clearTodo` - Clear task list
- `attemptCompletion` - Signal task completion (validates todos first)

## License

Apache-2.0
