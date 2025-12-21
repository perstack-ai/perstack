---
"@perstack/runtime": minor
"@perstack/core": minor
"@perstack/perstack": minor
"@perstack/provider-anthropic": minor
"@perstack/provider-openai": minor
"@perstack/provider-google": minor
"@perstack/provider-core": minor
---

Add native LLM reasoning support (Extended Thinking/Reasoning)

- Add `reasoningBudget` option to enable test-time scaling
- Support Anthropic Extended Thinking with thinking block preservation
- Support OpenAI Reasoning Effort with effort level mapping
- Support Google Flash Thinking with thinkingBudget configuration
- Add `ThinkingPart` message type for conversation history
- Add `thinking` field to `completeRun` event for observability
