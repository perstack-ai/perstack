# @perstack/storage

## 0.0.2

### Patch Changes

- [#117](https://github.com/perstack-ai/perstack/pull/117) [`6f728b6`](https://github.com/perstack-ai/perstack/commit/6f728b687b2544554cdf0f0ee63a6b585023cbb4) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add create-expert package and refactor runtime architecture

  - Add `create-expert`: Interactive Expert creation wizard with TUI
  - Add `@perstack/storage`: Extract storage layer from runtime for better modularity
  - Add CLI entry point to `@perstack/runtime` for standalone execution
  - Add wizard and progress TUI components to `@perstack/tui`
  - Update `perstack` CLI to use runtime via subprocess for better isolation
  - Remove LLM-driven runtime selection from delegation
  - Reorganize E2E tests by package (perstack-cli, perstack-runtime)
  - Increase maxBuffer for exec tool to 10MB

- Updated dependencies [[`6f728b6`](https://github.com/perstack-ai/perstack/commit/6f728b687b2544554cdf0f0ee63a6b585023cbb4), [`07365c0`](https://github.com/perstack-ai/perstack/commit/07365c0dce07b4b3a53dd2813c2bdf48151906af), [`7342f85`](https://github.com/perstack-ai/perstack/commit/7342f8511866cd66ec4090a666fd8f8384a748c4)]:
  - @perstack/core@0.0.23
