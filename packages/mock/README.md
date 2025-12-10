# @perstack/mock

Mock adapter for testing Perstack multi-runtime functionality.

## Installation

```bash
npm install @perstack/mock
```

## Usage

```typescript
import { MockAdapter } from "@perstack/mock"
import { registerAdapter } from "@perstack/core"

const mockAdapter = new MockAdapter({
  name: "perstack",
  mockOutput: "Test completed successfully",
})

registerAdapter("perstack", () => mockAdapter)
```

## Options

| Option           | Type          | Description                    |
| ---------------- | ------------- | ------------------------------ |
| `name`           | `RuntimeName` | Runtime name to mock           |
| `shouldFail`     | `boolean`     | Simulate prerequisite failure  |
| `failureMessage` | `string`      | Custom failure message         |
| `mockOutput`     | `string`      | Mock output text               |
| `delay`          | `number`      | Simulated execution delay (ms) |

## Use Cases

- Unit testing adapter registration
- Integration testing without real runtime CLIs
- E2E testing with predictable outputs
