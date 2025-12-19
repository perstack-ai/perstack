# Coding Style

## TypeScript

```typescript
export interface ExpertConfig {
  name: string
  version: string
  metadata?: Record<string, unknown>
}
```

Avoid:

- `any` types (use `unknown` if needed)
- `object` type (use `Record` instead)

## Zod Schema

```typescript
export const expertSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([])
})
```

Avoid ambiguous types like `z.any()`.

## Comments

Code that requires comments to be understood is poorly written code.

- Do NOT write comments by default
- Comments are allowed ONLY when:
  - The logic is fundamentally complex (algorithmic, mathematical)
  - External constraints force unintuitive implementations
  - Explaining "why" something is done unusually
- Never write comments that explain "what" the code does

## Blank Lines

Use blank lines to separate logical sections, not to fragment related code.

**DO use blank lines:**

- After import statements (one blank line)
- Between functions/methods (one blank line)
- Between major logical sections within a function

**DO NOT use blank lines:**

- Between closely related statements
- Inside control flow blocks
- Between a condition and its immediate consequence

## Prohibited Patterns

### Semicolon-prefixed expressions

```typescript
// Bad
;(mockFn as ReturnType<typeof mock>).mockResolvedValue(value)

// Good
const mockFnTyped = mockFn as ReturnType<typeof mock>
mockFnTyped.mockResolvedValue(value)
```

### IIFE for type casting

```typescript
// Bad
spyOn(process, "exit").mockImplementation((() => {}) as unknown as (code: number) => never)

// Good
const mockExit: (code: number) => never = () => undefined as never
spyOn(process, "exit").mockImplementation(mockExit)
```

### Suppression comments

```typescript
// @ts-ignore              // Never use
// @ts-expect-error        // Never use
// biome-ignore            // Never use
```

## Tests

```typescript
import { describe, it, expect } from "vitest"

describe("functionName", () => {
  it("should do something", () => {
    expect(result).toBe(expected)
  })
})
```

Test files are located next to source files:

```
apps/runtime/src/
├── executor.ts
├── executor.test.ts
```
