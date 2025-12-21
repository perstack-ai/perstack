---
"@perstack/anthropic-provider": minor
"@perstack/api-client": minor
"@perstack/azure-openai-provider": minor
"@perstack/base": minor
"@perstack/bedrock-provider": minor
"@perstack/claude-code": minor
"@perstack/core": minor
"@perstack/cursor": minor
"@perstack/deepseek-provider": minor
"@perstack/docker": minor
"@perstack/filesystem-storage": minor
"@perstack/gemini": minor
"@perstack/google-provider": minor
"@perstack/mock": minor
"@perstack/ollama-provider": minor
"@perstack/openai-provider": minor
"@perstack/provider-core": minor
"@perstack/runner": minor
"@perstack/runtime": minor
"@perstack/vertex-provider": minor
"perstack": minor
---

Add native LLM reasoning support (Extended Thinking/Reasoning)

- Add `reasoningBudget` option to enable test-time scaling
- Support Anthropic Extended Thinking with thinking block preservation
- Support OpenAI Reasoning Effort with effort level mapping
- Support Google Flash Thinking with thinkingBudget configuration
- Add `ThinkingPart` message type for conversation history
- Add `thinking` field to `completeRun` event for observability
