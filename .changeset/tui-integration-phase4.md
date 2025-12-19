---
"perstack": patch
"create-expert": patch
---

refactor: integrate TUI components into apps (Phase 4)

This change integrates the @perstack/tui package directly into the apps that use it:

- `apps/perstack`: Now contains TUI components for start, status, publish, tag, unpublish, and progress
- `apps/create-expert`: Now contains the wizard TUI component

The @perstack/tui package has been removed as a separate package. Each app now owns its UI components directly.
