---
"@perstack/core": patch
"@perstack/provider-core": patch
"@perstack/azure-openai-provider": patch
"@perstack/bedrock-provider": patch
"@perstack/vertex-provider": patch
"@perstack/deepseek-provider": patch
"@perstack/google-provider": patch
"@perstack/ollama-provider": patch
"@perstack/openai-provider": patch
---

Complete ProviderAdapter implementations for all AI providers

- Add error normalization and retryability for Azure OpenAI, Bedrock, Vertex, DeepSeek, and Ollama
- Add provider tools for Google (fileSearch, googleMaps), Azure OpenAI (webSearchPreview, fileSearch, codeInterpreter, imageGeneration), and Vertex (codeExecution, urlContext, googleSearch, enterpriseWebSearch, googleMaps)
- Add provider options for Bedrock (guardrails, cachePoint), Vertex (safetySettings), and Ollama (think)
- Add comprehensive unit tests for all providers

Closes #243
