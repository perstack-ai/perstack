---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/api-client": minor
"@perstack/mock": minor
"@perstack/runner": minor
"@perstack/anthropic-provider": minor
"@perstack/azure-openai-provider": minor
"@perstack/base": minor
"@perstack/bedrock-provider": minor
"@perstack/claude-code": minor
"@perstack/cursor": minor
"@perstack/deepseek-provider": minor
"@perstack/docker": minor
"@perstack/filesystem-storage": minor
"@perstack/gemini": minor
"@perstack/google-provider": minor
"@perstack/ollama-provider": minor
"@perstack/openai-provider": minor
"@perstack/provider-core": minor
"@perstack/vertex-provider": minor
"create-expert": minor
"perstack": minor
---

feat: introduce `perstack install` command and `perstack.lock` for faster startup

This feature enables instant LLM inference by pre-collecting tool definitions:

- Added `perstack install` command that generates `perstack.lock` file
- Lockfile contains all expert definitions and tool schemas from MCP skills
- Runtime uses lockfile to skip MCP initialization and start inference immediately
- Skills are lazily initialized only when their tools are actually called

Benefits:
- Near-zero startup latency (from 500ms-6s per skill to <50ms total)
- Reproducible builds with locked tool definitions
- Faster production deployments
