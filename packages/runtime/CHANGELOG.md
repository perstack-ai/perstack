# @perstack/runtime

## 0.0.56

### Patch Changes

- [#12](https://github.com/perstack-ai/perstack/pull/12) [`50c1640`](https://github.com/perstack-ai/perstack/commit/50c16404b3e34b7fb40a03a3edeb9b9da2d09844) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Avoid object mutation in getSkillManagers and resolveExpertToRun

## 0.0.55

### Patch Changes

- [#11](https://github.com/perstack-ai/perstack/pull/11) [`a6ab2b8`](https://github.com/perstack-ai/perstack/commit/a6ab2b8b246d60e2b366901d7b441febec2e258f) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Clean up initialized skill managers when delegate expert is not found

- [#9](https://github.com/perstack-ai/perstack/pull/9) [`cd5dbb1`](https://github.com/perstack-ai/perstack/commit/cd5dbb1a46372a6772ec78ff24292a541fc0d081) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add explicit error message when delegate expert is not found

## 0.0.54

### Patch Changes

- [#7](https://github.com/perstack-ai/perstack/pull/7) [`84a5692`](https://github.com/perstack-ai/perstack/commit/84a5692c7ba906962ff24c28074822e9eedda60a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Handle file read errors gracefully in resolving PDF and image file states

## 0.0.53

### Patch Changes

- [#5](https://github.com/perstack-ai/perstack/pull/5) [`d683ae0`](https://github.com/perstack-ai/perstack/commit/d683ae09284e95a1a5b12701bd2ae466e3b620bd) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix closeSkillManagers to continue closing other managers when one fails

## 0.0.52

### Patch Changes

- [#3](https://github.com/perstack-ai/perstack/pull/3) [`b5c7cf3`](https://github.com/perstack-ai/perstack/commit/b5c7cf3f0314cc7a181606a9497fe077b4e7aecc) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix maxSteps off-by-one error that caused one extra step to execute

## 0.0.51

### Patch Changes

- [#1](https://github.com/perstack-ai/perstack/pull/1) [`0719f70`](https://github.com/perstack-ai/perstack/commit/0719f702a751dc4cc8cc7de4a9287ba81e8db4d2) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add related documentation links to README

## 0.0.50

### Patch Changes

- Remove workspace parameter from runtime

  The runtime now executes in the current working directory instead of accepting a workspace parameter. This fixes a sandbox design flaw where the application controlled its own execution boundary.

- Updated dependencies
  - @perstack/core@0.0.17
  - @perstack/api-client@0.0.28

## 0.0.49

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
  - @perstack/api-client@0.0.27
  - @perstack/core@0.0.16

## 0.0.48

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.26
  - @perstack/core@0.0.15

## 0.0.47

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.25
  - @perstack/core@0.0.14

## 0.0.46

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.24
  - @perstack/core@0.0.13

## 0.0.45

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.23
  - @perstack/core@0.0.12

## 0.0.44

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.22
  - @perstack/core@0.0.11

## 0.0.43

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.21
  - @perstack/core@0.0.10

## 0.0.42

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.20
  - @perstack/core@0.0.9

## 0.0.41

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.19

## 0.0.40

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.18

## 0.0.39

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @perstack/api-client@0.0.17

## 0.0.38

### Patch Changes

- add lazy init to skill manager
- Updated dependencies
  - @perstack/core@0.0.8
  - @perstack/api-client@0.0.15

## 0.0.37

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.7
  - @perstack/api-client@0.0.14

## 0.0.36

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.13
  - @perstack/core@0.0.6

## 0.0.35

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.12

## 0.0.34

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.11

## 0.0.33

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.10

## 0.0.32

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.9

## 0.0.31

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.8

## 0.0.30

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.7

## 0.0.29

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.6

## 0.0.28

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.5
  - @perstack/core@0.0.5

## 0.0.27

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.4
  - @perstack/core@0.0.4

## 0.0.26

### Patch Changes

- Test: Setting up changeset
- Updated dependencies
  - @perstack/api-client@0.0.3
  - @perstack/core@0.0.3

## 0.0.25

### Patch Changes

- Test
- Updated dependencies
  - @perstack/api-client@0.0.2
  - @perstack/core@0.0.2
