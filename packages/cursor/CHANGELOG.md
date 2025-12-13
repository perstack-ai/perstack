# @perstack/cursor

## 0.0.2

### Patch Changes

- [#87](https://github.com/perstack-ai/perstack/pull/87) [`7342f85`](https://github.com/perstack-ai/perstack/commit/7342f8511866cd66ec4090a666fd8f8384a748c4) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add multi-runtime support Wave 3

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

- Updated dependencies [[`6f728b6`](https://github.com/perstack-ai/perstack/commit/6f728b687b2544554cdf0f0ee63a6b585023cbb4), [`07365c0`](https://github.com/perstack-ai/perstack/commit/07365c0dce07b4b3a53dd2813c2bdf48151906af), [`7342f85`](https://github.com/perstack-ai/perstack/commit/7342f8511866cd66ec4090a666fd8f8384a748c4)]:
  - @perstack/core@0.0.23
