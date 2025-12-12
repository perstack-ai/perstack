---
"@perstack/create-expert": patch
"@perstack/storage": patch
"@perstack/runtime": patch
"@perstack/tui": patch
"perstack": patch
"@perstack/runner": patch
"@perstack/core": patch
"@perstack/base": patch
---

Add create-expert package and refactor runtime architecture

- Add `@perstack/create-expert`: Interactive Expert creation wizard with TUI
- Add `@perstack/storage`: Extract storage layer from runtime for better modularity
- Add CLI entry point to `@perstack/runtime` for standalone execution
- Add wizard and progress TUI components to `@perstack/tui`
- Update `perstack` CLI to use runtime via subprocess for better isolation
- Remove LLM-driven runtime selection from delegation
- Reorganize E2E tests by package (perstack-cli, perstack-runtime)
- Increase maxBuffer for exec tool to 10MB
