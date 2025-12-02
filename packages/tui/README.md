# @perstack/tui

Text User Interface (TUI) components for the Perstack CLI.

This is an internal package used by the `perstack` CLI. It provides interactive terminal interfaces for Expert selection, execution monitoring, publishing, and other operations.

## Installation

```bash
npm install @perstack/tui
```

## Exports

| Function          | Description                                   |
| ----------------- | --------------------------------------------- |
| `renderStart`     | Interactive Expert selection and execution UI |
| `renderPublish`   | Publishing wizard UI                          |
| `renderStatus`    | Status management wizard UI                   |
| `renderTag`       | Tag management wizard UI                      |
| `renderUnpublish` | Unpublish wizard UI                           |

## Types

```typescript
import type { PerstackEvent, RunHistoryItem, CheckpointHistoryItem, EventHistoryItem } from "@perstack/tui"
```

## License

Apache-2.0
