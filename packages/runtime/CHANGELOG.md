# @perstack/runtime

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
