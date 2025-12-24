# @perstack/s3-storage

## 0.0.3

### Patch Changes

- [#248](https://github.com/perstack-ai/perstack/pull/248) [`d6b7d4d`](https://github.com/perstack-ai/perstack/commit/d6b7d4d34fa9f92c57d324884e4fa6603ec577a1) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add `perstack log` command for viewing execution history and events.

  This command enables developers and AI agents to inspect job/run history for debugging purposes. Features include:

  - View events by job, run, or checkpoint
  - Filter events by type, step number, or custom expressions
  - Preset filters for errors, tools, and delegations
  - Human-readable terminal output with colors
  - JSON output for machine parsing
  - Summary view for quick diagnosis

- [#247](https://github.com/perstack-ai/perstack/pull/247) [`9da758b`](https://github.com/perstack-ai/perstack/commit/9da758b3b59047a7086d5748dbaa586bbd9dbca1) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add S3 and R2 storage backends with unified Storage interface

  - Add `Storage` interface and `EventMeta` type to `@perstack/core`
  - Create `@perstack/s3-compatible-storage` package with shared S3 logic
  - Create `@perstack/s3-storage` package for AWS S3 storage
  - Create `@perstack/r2-storage` package for Cloudflare R2 storage
  - Add `FileSystemStorage` class to `@perstack/filesystem-storage` implementing Storage interface
  - Maintain backward compatibility with existing function exports

### Patch Changes

- Updated dependencies [[`d6b7d4d`](https://github.com/perstack-ai/perstack/commit/d6b7d4d34fa9f92c57d324884e4fa6603ec577a1), [`9da758b`](https://github.com/perstack-ai/perstack/commit/9da758b3b59047a7086d5748dbaa586bbd9dbca1)]:
  - @perstack/s3-compatible-storage@0.1.0
