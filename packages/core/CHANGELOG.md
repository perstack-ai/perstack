# @perstack/core

## 0.0.19

### Patch Changes

- [#45](https://github.com/perstack-ai/perstack/pull/45) [`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add event detail view in history browser

  Users can now select an event in the events list to view its details including type, step number, timestamp, and IDs.

## 0.0.18

### Patch Changes

- [#14](https://github.com/perstack-ai/perstack/pull/14) [`eb2f4cc`](https://github.com/perstack-ai/perstack/commit/eb2f4cc1900bb7ae02bf21c375bdade891d9823e) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add runSettingSchema for validating stored run settings

## 0.0.17

### Patch Changes

- Remove workspace parameter from runtime

  The runtime now executes in the current working directory instead of accepting a workspace parameter. This fixes a sandbox design flaw where the application controlled its own execution boundary.

## 0.0.16

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

## 0.0.15

### Patch Changes

- init

## 0.0.14

### Patch Changes

- init

## 0.0.13

### Patch Changes

- init

## 0.0.12

### Patch Changes

- init

## 0.0.11

### Patch Changes

- init

## 0.0.10

### Patch Changes

- init

## 0.0.9

### Patch Changes

- init

## 0.0.8

### Patch Changes

- add lazy init to skill manager

## 0.0.7

### Patch Changes

- init

## 0.0.6

### Patch Changes

- init

## 0.0.5

### Patch Changes

- Init

## 0.0.4

### Patch Changes

- Init

## 0.0.3

### Patch Changes

- Test: Setting up changeset

## 0.0.2

### Patch Changes

- Test
