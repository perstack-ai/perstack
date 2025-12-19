---
---

Refactored monorepo structure:
- Moved runtime adapters (docker, claude-code, cursor, gemini) to packages/runtimes/
- Moved storage to packages/storages/filesystem and renamed to @perstack/filesystem-storage
