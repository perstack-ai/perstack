---
"@perstack/core": patch
"@perstack/runtime": patch
"perstack": patch
"create-expert": patch
"@perstack/base": patch
"@perstack/api-client": patch
---

Change default runtime from `perstack` to `docker` for security-by-default posture.

**Breaking Changes:**

- Default runtime is now `docker` instead of `perstack`
- The `perstack` runtime has been renamed to `local`

**Migration:**

If you have `runtime = "perstack"` in your `perstack.toml`, update it to `runtime = "local"`.

The `docker` runtime provides container isolation and network restrictions by default. Use `--runtime local` only for trusted environments where Docker is not available.
