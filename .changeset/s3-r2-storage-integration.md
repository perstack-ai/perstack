---
"@perstack/core": minor
"@perstack/filesystem-storage": minor
"@perstack/s3-compatible-storage": minor
"@perstack/s3-storage": minor
"@perstack/r2-storage": minor
---

Add S3 and R2 storage backends with unified Storage interface

- Add `Storage` interface and `EventMeta` type to `@perstack/core`
- Create `@perstack/s3-compatible-storage` package with shared S3 logic
- Create `@perstack/s3-storage` package for AWS S3 storage
- Create `@perstack/r2-storage` package for Cloudflare R2 storage
- Add `FileSystemStorage` class to `@perstack/filesystem-storage` implementing Storage interface
- Maintain backward compatibility with existing function exports
