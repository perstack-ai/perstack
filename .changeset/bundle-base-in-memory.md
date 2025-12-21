---
"@perstack/runtime": minor
"@perstack/base": minor
"@perstack/core": minor
"@perstack/api-client": minor
"@perstack/filesystem-storage": minor
"@perstack/anthropic-provider": minor
"@perstack/azure-openai-provider": minor
"@perstack/bedrock-provider": minor
"@perstack/deepseek-provider": minor
"@perstack/google-provider": minor
"@perstack/ollama-provider": minor
"@perstack/openai-provider": minor
"@perstack/provider-core": minor
"@perstack/vertex-provider": minor
"@perstack/runner": minor
"@perstack/docker": minor
"@perstack/cursor": minor
"@perstack/claude-code": minor
"@perstack/gemini": minor
"@perstack/mock": minor
"@perstack/e2e-mcp-server": minor
"create-expert": minor
"perstack": minor
---

feat: bundle @perstack/base into runtime with InMemoryTransport

Eliminates ~500ms startup latency for the base skill by using in-process MCP communication via InMemoryTransport. The bundled base skill now runs in the same process as the runtime, achieving near-zero initialization latency (<50ms).

Key changes:
- Added `createBaseServer()` export from @perstack/base for in-process server creation
- Added `InMemoryTransport` support to transport factory
- Added `InMemoryBaseSkillManager` for bundled base skill execution
- Runtime now uses bundled base by default (no version specified)
- Explicit version pinning (e.g., `@perstack/base@0.0.34`) falls back to npx + StdioTransport

This is the foundation for #197 (perstack install) which will enable instant Expert startup.
