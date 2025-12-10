---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/tui": minor
"perstack": minor
---

Add multi-runtime support Wave 3

Features:

- Add runtime field display in TUI
- Add runtime field to Registry API createRegistryExpert
- Add E2E tests and MockAdapter for multi-runtime
- Update documentation for multi-runtime support

Improvements:

- Fix exit code default consistency in adapters
- Add CLI exit code validation
- Fix JSON parsing in Claude Code output
- Include checkpoint message in step.newMessages
- Pass startedAt timestamp to completeRun event
