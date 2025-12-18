---
"@perstack/core": patch
"@perstack/docker": patch
---

Fix Docker runtime E2E test failure

- Add `lazyInit` field to perstack.toml schema for MCP skills
- Change `lazyInit` default from `true` to `false` for more predictable skill initialization
- Add `.cache` tmpfs mount to Docker compose for npm/npx cache directory
