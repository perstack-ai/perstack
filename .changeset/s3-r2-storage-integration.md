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
"@perstack/r2-storage": minor
"@perstack/runner": minor
"@perstack/runtime": minor
"@perstack/s3-compatible-storage": minor
"@perstack/s3-storage": minor
"@perstack/vertex-provider": minor
"create-expert": minor
"perstack": minor
---

Add S3 and R2 storage backends with unified Storage interface

- Add `Storage` interface and `EventMeta` type to `@perstack/core`
- Create `@perstack/s3-compatible-storage` package with shared S3 logic
- Create `@perstack/s3-storage` package for AWS S3 storage
- Create `@perstack/r2-storage` package for Cloudflare R2 storage
- Add `FileSystemStorage` class to `@perstack/filesystem-storage` implementing Storage interface
- Maintain backward compatibility with existing function exports
