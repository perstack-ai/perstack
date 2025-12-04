# @perstack/tui

## 0.0.17

### Patch Changes

- [#45](https://github.com/perstack-ai/perstack/pull/45) [`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add event detail view in history browser

  Users can now select an event in the events list to view its details including type, step number, timestamp, and IDs.

- [#48](https://github.com/perstack-ai/perstack/pull/48) [`5141845`](https://github.com/perstack-ai/perstack/commit/514184512b1ccbe1ec0f7def033cca7f0dac6e86) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Optimize buildSteps for large event counts using incremental updates

  Instead of rebuilding the entire step map on every event addition, the step
  store now caches the map and only processes new events. Full rebuild only
  occurs when events are truncated (MAX_EVENTS exceeded) or historical events
  are loaded.

- Updated dependencies [[`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a)]:
  - @perstack/core@0.0.19

## 0.0.16

### Patch Changes

- [#36](https://github.com/perstack-ai/perstack/pull/36) [`17dfee7`](https://github.com/perstack-ai/perstack/commit/17dfee73fa8cb4e17c6deaec17d0d6653736e0af) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Share VersionSelector component across wizard apps

## 0.0.15

### Patch Changes

- Updated dependencies [[`eb2f4cc`](https://github.com/perstack-ai/perstack/commit/eb2f4cc1900bb7ae02bf21c375bdade891d9823e)]:
  - @perstack/core@0.0.18

## 0.0.14

### Patch Changes

- Updated dependencies
  - @perstack/core@0.0.17

## 0.0.13

### Patch Changes

- Add health check tool, Zod error formatting, and refactor SkillManager

  Features:

  - Add healthCheck tool to @perstack/base for runtime health monitoring
  - Add friendly Zod error formatting utility to @perstack/core
  - Export BaseEvent interface from @perstack/core

  Improvements:

  - Refactor SkillManager into separate classes (McpSkillManager, InteractiveSkillManager, DelegateSkillManager)
  - Use discriminatedUnion for provider settings in perstack.toml schema
  - Add JSDoc documentation to all core schema types
  - Add Skill Management documentation

- Updated dependencies
  - @perstack/core@0.0.16

## 0.0.12

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.15

## 0.0.11

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.14

## 0.0.10

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.13

## 0.0.9

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.12

## 0.0.8

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.11

## 0.0.7

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.10

## 0.0.6

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.9

## 0.0.5

### Patch Changes

- init

## 0.0.4

### Patch Changes

- init

## 0.0.3

### Patch Changes

- init
- init
- init
