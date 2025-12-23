---
"perstack": minor
"@perstack/runtime": minor
"@perstack/core": minor
"@perstack/api-client": minor
"@perstack/runner": minor
"@perstack/filesystem-storage": minor
"@perstack/base": minor
"@perstack/docker": minor
"@perstack/cursor": minor
"@perstack/claude-code": minor
"@perstack/gemini": minor
"@perstack/mock": minor
"@perstack/anthropic-provider": minor
"@perstack/openai-provider": minor
"@perstack/google-provider": minor
"@perstack/ollama-provider": minor
"@perstack/azure-openai-provider": minor
"@perstack/bedrock-provider": minor
"@perstack/vertex-provider": minor
"@perstack/deepseek-provider": minor
"@perstack/provider-core": minor
"@perstack/s3-compatible-storage": minor
"@perstack/s3-storage": minor
"@perstack/r2-storage": minor
---

Add `perstack log` command for viewing execution history and events.

This command enables developers and AI agents to inspect job/run history for debugging purposes. Features include:
- View events by job, run, or checkpoint
- Filter events by type, step number, or custom expressions
- Preset filters for errors, tools, and delegations
- Human-readable terminal output with colors
- JSON output for machine parsing
- Summary view for quick diagnosis
