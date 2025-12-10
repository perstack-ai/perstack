---
"@perstack/core": patch
"@perstack/runtime": patch
"@perstack/api-client": patch
"@perstack/base": patch
"@perstack/tui": patch
"@perstack/cursor": patch
"@perstack/claude-code": patch
"@perstack/gemini": patch
"@perstack/mock": patch
"@perstack/runner": patch
"perstack": patch
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
