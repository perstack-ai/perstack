# Code Review Report: @perstack/tui

**Date**: 2025-12-04  
**Reviewer**: AI Code Review  
**Package**: `packages/tui`  
**Related Packages**: `packages/perstack`, `packages/core`

---

## Executive Summary

The `@perstack/tui` package provides terminal UI components for the Perstack CLI. Overall, the codebase demonstrates good TypeScript practices and a well-organized structure. However, there are several opportunities for improvement, particularly around code duplication and error handling consistency.

---

## Strengths

### 1. Well-Organized Directory Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks (actions/, core/, state/, ui/)
├── types/          # Type definitions
├── utils/          # Utility functions
└── context/        # React contexts
```

This separation of concerns makes the codebase easy to navigate.

### 2. Strong Type Safety

- All components and hooks are properly typed
- Uses `@perstack/core` types (`RunEvent`, `RuntimeEvent`, `ToolCall`, `ToolResult`)
- Discriminated union types for state management (`InputState`)
- Custom type guards (`isToolCallEvent`, `isToolResultEvent`)

### 3. Well-Designed Custom Hooks

| Hook                | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `useAppState`       | Orchestrates all state management               |
| `useStepStore`      | Manages runtime step display                    |
| `useInputState`     | Reducer-based input state machine               |
| `useListNavigation` | Reusable list navigation logic                  |
| `useTextInput`      | Text input handling                             |
| `useLatestRef`      | Keeps ref current without triggering re-renders |

### 4. Centralized Constants

```typescript
// constants.ts
export const UI_CONSTANTS = { MAX_VISIBLE_LIST_ITEMS: 25, ... }
export const RENDER_CONSTANTS = { EXEC_OUTPUT_MAX_LINES: 4, ... }
export const KEY_BINDINGS = { NAVIGATE_UP: "↑", ... }
export const STOP_EVENT_TYPES = [...]
```

### 5. Robust EventQueue Implementation

`EventQueue` class handles:
- Buffering events before handler is set
- Max pending events limit (1000)
- Safe error handling with configurable error logger

---

## Issues and Recommendations

### Critical

#### 1. Error State Keyboard Handler Missing

**Location**: `apps/status/app.tsx`, `apps/tag/app.tsx`, `apps/unpublish/app.tsx`

**Problem**: Error state displays "Press any key to go back" but no keyboard handler is registered.

```typescript
// apps/status/app.tsx:406-414
case "error":
  return (
    <Box flexDirection="column">
      <Text color="red">Error: {step.message}</Text>
      <Box marginTop={1}>
        <Text dimColor>Press any key to go back</Text>  // No handler!
      </Box>
    </Box>
  )
```

**Recommendation**: Add `useInput` handler in error state:

```typescript
function ErrorStep({ message, onBack }: { message: string; onBack: () => void }) {
  useInput(() => onBack())
  return (
    <Box flexDirection="column">
      <Text color="red">Error: {message}</Text>
      <Box marginTop={1}>
        <Text dimColor>Press any key to go back</Text>
      </Box>
    </Box>
  )
}
```

---

### High Priority

#### 2. Significant Code Duplication in `apps/` Directory

**Location**: `apps/status/app.tsx`, `apps/tag/app.tsx`, `apps/unpublish/app.tsx`, `apps/publish/app.tsx`

**Duplicated Components**:

| Component         | Files   | Lines (~) |
| ----------------- | ------- | --------- |
| `ExpertSelector`  | 4 files | ~35 each  |
| `VersionSelector` | 3 files | ~50 each  |
| `getStatusColor`  | 3 files | ~10 each  |

**Recommendation**: Extract shared components to `src/components/`:

```typescript
// src/components/wizard/expert-selector.tsx
// src/components/wizard/version-selector.tsx
// src/utils/status-color.ts
```

#### 3. Duplicate Type Definitions

**Location**: Multiple `app.tsx` files

**Duplicated Types**:

| Type           | Locations                                                               |
| -------------- | ----------------------------------------------------------------------- |
| `ExpertChoice` | `publish/app.tsx`, `status/app.tsx`, `tag/app.tsx`, `unpublish/app.tsx` |
| `VersionInfo`  | `status/app.tsx`, `tag/app.tsx`, `unpublish/app.tsx`                    |

**Recommendation**: Move to `src/types/wizard.ts` and export from index:

```typescript
// src/types/wizard.ts
export type ExpertChoice = {
  name: string
  description?: string
}

export type VersionInfo = {
  key: string
  version: string
  tags: string[]
  status: "available" | "deprecated" | "disabled"
}
```

---

### Medium Priority

#### 4. Potential Bug in Tag Comparison

**Location**: `apps/tag/app.tsx:242-243`

**Problem**: Array comparison assumes same order:

```typescript
const tagsChanged =
  tags.length !== customCurrentTags.length || tags.some((t, i) => t !== customCurrentTags[i])
```

**Recommendation**: Use Set comparison or sort before comparing:

```typescript
const tagsChanged = 
  tags.length !== customCurrentTags.length || 
  !tags.every(t => customCurrentTags.includes(t))
```

#### 5. React Key Warning Risk

**Location**: `src/components/step.tsx`

**Problem**: Keys using index and content may collide:

```typescript
<Text key={`todo-${idx}-${todo}`} ...>
<Text key={`out-${idx}-${line}`} ...>
```

If `line` content is identical across iterations, keys will collide.

**Recommendation**: Use unique identifiers or include more context in key generation.

#### 6. Magic Number in Timeout

**Location**: `packages/perstack/src/start.ts:178`

```typescript
setTimeout(() => { ... }, 60000)  // 1 minute
```

**Recommendation**: Use constant from `@perstack/core`:

```typescript
import { defaultContinueTimeout } from "@perstack/core"
setTimeout(() => { ... }, defaultContinueTimeout)
```

#### 7. Performance Concern in buildSteps

**Location**: `src/hooks/state/use-step-store.ts:37-79`

**Problem**: `buildSteps` processes all events on every addition. With `MAX_EVENTS = 1000`, this could become slow.

**Recommendation**: Consider incremental updates or memoization based on event count:

```typescript
const steps = useMemo(() => {
  if (events.length === prevCount.current) return prevSteps.current
  return buildSteps(events)
}, [events])
```

---

### Low Priority

#### 8. Inconsistent Naming Conventions

| Usage          | Type Name      | Location            |
| -------------- | -------------- | ------------------- |
| Apps (wizards) | `ExpertChoice` | `apps/*/app.tsx`    |
| Main TUI       | `ExpertOption` | `src/types/base.ts` |

**Recommendation**: Unify to single type name (`ExpertOption`) across all files.

#### 9. Inconsistent Key Hint Formatting

**Location**: Various input components

```typescript
// browsing-history.tsx
`${KEY_HINTS.NAVIGATE} ${KEY_HINTS.RESUME} ${KEY_HINTS.CHECKPOINTS} ${KEY_HINTS.NEW}`

// constants.ts KEY_HINTS values
`↑↓:Navigate`  // colon format
```

vs legacy format in apps:

```typescript
// apps/publish/app.tsx
"↑↓ navigate · enter select · q quit"  // different separator
```

**Recommendation**: Standardize hint format across all apps.

#### 10. Unused Feature Placeholder

**Location**: `src/components/input-areas/browsing-events.tsx:17`

```typescript
onSelect={noop}  // Events are view-only
```

**Recommendation**: Either implement event detail view or document this as intentional.

---

## Architecture Observations

### State Management Flow

```
App
 └─ useAppState (orchestrator)
     ├─ useStepStore (events → display steps)
     ├─ useRuntimeInfo (runtime metadata)
     ├─ useInputState (reducer: browsing/editing/running)
     ├─ useRunActions (run lifecycle)
     ├─ useExpertActions (expert selection)
     └─ useHistoryActions (history navigation)
```

This composition pattern is well-designed and maintainable.

### Context Usage

`InputAreaContext` provides callbacks to deeply nested browsing components without prop drilling. Good pattern.

### Apps vs Src Separation

| Directory     | Purpose                                                 |
| ------------- | ------------------------------------------------------- |
| `apps/`       | Standalone wizard UIs (publish, status, tag, unpublish) |
| `apps/start/` | Main TUI entry using `src/` components                  |
| `src/`        | Shared components, hooks, types                         |

**Observation**: `apps/` wizards could benefit from more code sharing with `src/`.

---

## Integration with packages/perstack

The TUI is used by CLI commands:

| Command     | TUI Function      | Purpose                                    |
| ----------- | ----------------- | ------------------------------------------ |
| `start`     | `renderStart`     | Interactive expert selection and execution |
| `publish`   | `renderPublish`   | Expert selection for publishing            |
| `status`    | `renderStatus`    | Version/status management wizard           |
| `tag`       | `renderTag`       | Tag management wizard                      |
| `unpublish` | `renderUnpublish` | Unpublish wizard                           |

Integration is clean with Promise-based APIs returning results or null on cancel.

---

## Testing Status

Per `AGENTS.md`, `@perstack/tui` is covered by E2E tests only (see `E2E.md`). No unit tests exist in this package, which is intentional given the UI-heavy nature.

---

## Summary of Recommended Actions

| Priority | Issue                            | Effort |
| -------- | -------------------------------- | ------ |
| Critical | Add error state keyboard handler | Low    |
| High     | Extract shared wizard components | Medium |
| High     | Consolidate duplicate types      | Low    |
| Medium   | Fix tag comparison logic         | Low    |
| Medium   | Address React key collision risk | Low    |
| Medium   | Extract magic timeout constant   | Low    |
| Low      | Unify naming conventions         | Low    |
| Low      | Standardize key hint format      | Low    |

---

## Conclusion

The `@perstack/tui` package is well-architected with proper separation of concerns and type safety. The main areas for improvement are:

1. **Immediate**: Fix the error state keyboard handler bug
2. **Short-term**: Reduce code duplication in `apps/` directory
3. **Long-term**: Consider performance optimization for high event counts

The codebase follows the project's coding standards (no comments, minimal blank lines, English only) and integrates cleanly with `@perstack/core` types.
