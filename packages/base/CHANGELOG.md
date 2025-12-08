# @perstack/base

## 0.0.33

### Patch Changes

- [#62](https://github.com/perstack-ai/perstack/pull/62) [`3b64f88`](https://github.com/perstack-ai/perstack/commit/3b64f886b2e6f030d0e75d0baf4b51fb4d3747b8) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add parallel tool call support and mixed tool call handling

  Features:

  - Process all tool calls from a single LLM response instead of only the first one
  - MCP tools execute in parallel using `Promise.all`
  - Support mixed tool calls (MCP + Delegate + Interactive in same response)
  - Process tools in priority order: MCP → Delegate → Interactive
  - Preserve partial results across checkpoint boundaries

  Schema Changes:

  - `Step.toolCall` → `Step.toolCalls` (array)
  - `Step.toolResult` → `Step.toolResults` (array)
  - Add `Step.pendingToolCalls` for tracking unprocessed tool calls
  - Add `Checkpoint.pendingToolCalls` and `Checkpoint.partialToolResults` for resume

  Event Changes:

  - `callTool` → `callTools`
  - `resolveToolResult` → `resolveToolResults`
  - Add `resumeToolCalls` and `finishAllToolCalls` events

## 0.0.32

### Patch Changes

- [#57](https://github.com/perstack-ai/perstack/pull/57) [`f5fc0ec`](https://github.com/perstack-ai/perstack/commit/f5fc0ec4eaf66fe80ad99e4d23e2757bf4471f07) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Remove character limits from file operation tools

  The following tools no longer have character limits:

  - writeTextFile: removed 10,000 character limit
  - appendTextFile: removed 2,000 character limit
  - editTextFile: removed 2,000 character limit for both newText and oldText

## 0.0.31

### Patch Changes

- [#45](https://github.com/perstack-ai/perstack/pull/45) [`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add event detail view in history browser

  Users can now select an event in the events list to view its details including type, step number, timestamp, and IDs.

## 0.0.30

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

## 0.0.29

### Patch Changes

- init

## 0.0.28

### Patch Changes

- init

## 0.0.27

### Patch Changes

- init

## 0.0.26

### Patch Changes

- init

## 0.0.25

### Patch Changes

- init

## 0.0.24

### Patch Changes

- init

## 0.0.23

### Patch Changes

- init

## 0.0.22

### Patch Changes

- init

## 0.0.21

### Patch Changes

- init

## 0.0.20

### Patch Changes

- init

## 0.0.18

### Patch Changes

- init
- init
- init

## 0.0.15

### Patch Changes

- init

## 0.0.14

### Patch Changes

- init

## 0.0.13

### Patch Changes

- Init

## 0.0.12

### Patch Changes

- Init

## 0.0.11

### Patch Changes

- Init

## 0.0.10

### Patch Changes

- Init

## 0.0.9

### Patch Changes

- Test: Setting up changeset

## 0.0.8

### Patch Changes

- Test
