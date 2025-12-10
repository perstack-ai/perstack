---
"@perstack/core": minor
"@perstack/runtime": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/tui": minor
"@perstack/cursor": minor
"@perstack/claude-code": minor
"@perstack/gemini": minor
"@perstack/mock": minor
"@perstack/runner": minor
"perstack": minor
---

Add multi-runtime support Wave 3

Features:

- Separate adapter implementations into dedicated packages
- Add @perstack/runner for centralized adapter dispatch
- Add @perstack/mock for testing adapters
- Add runtime field display in TUI
- Add runtime field to Registry API createRegistryExpert
- Add E2E tests for multi-runtime
- Update documentation for multi-runtime support

Improvements:

- Reorganize @perstack/runtime internal structure
- Fix exit code default consistency in adapters
- Add CLI exit code validation
- Fix JSON parsing in Claude Code output
- Include checkpoint message in step.newMessages
- Pass startedAt timestamp to completeRun event
