---
"@perstack/runtime": minor
"@perstack/core": minor
"@perstack/provider-core": minor
"@perstack/anthropic-provider": minor
"@perstack/openai-provider": minor
"@perstack/google-provider": minor
"@perstack/ollama-provider": minor
"@perstack/azure-openai-provider": minor
"@perstack/bedrock-provider": minor
"@perstack/vertex-provider": minor
"@perstack/deepseek-provider": minor
"@perstack/api-client": minor
"@perstack/mock": minor
"@perstack/runner": minor
---

Add pluggable LLM provider architecture with ProviderAdapter pattern

- Introduce `ProviderAdapter` interface and `BaseProviderAdapter` abstract class in `@perstack/provider-core`
- Add provider-specific adapters for Anthropic, OpenAI, Google, Ollama, Azure OpenAI, Bedrock, Vertex, and DeepSeek
- Add `LLMExecutor` layer to encapsulate LLM calls with provider-specific error handling and retry logic
- Add `ProviderAdapterFactory` with dynamic import support for future npm package installation pattern
- Extend Expert and PerstackConfigExpert schemas to support `providerTools`, `providerSkills`, and `providerToolOptions`
- Add `createTestContext` helper for improved test ergonomics
