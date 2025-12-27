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

### `as` type assertions

**Never use `as` for type casting.** Use type guards with `in` operator instead.

```typescript
// Bad - unsafe cast, no runtime check
const user = data as User
const name = (response as { name: string }).name

// Good - type guard with `in` operator
if (typeof data === "object" && data !== null && "name" in data && "email" in data) {
  // data is narrowed to have name and email properties
  console.log(data.name)
}

// Good - user-defined type guard
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    "email" in data
  )
}

if (isUser(data)) {
  // data is User
  console.log(data.name)
}
```

**Exception:** Only allowed in test mocks where type safety is explicitly traded for test ergonomics.

```typescript
// Allowed in *.test.ts only
const mockFn = fn as ReturnType<typeof mock>
```

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

### Unnecessary `await`

TypeScript warns when `await` has no effect. Remove these when found.

```typescript
// Bad
await expect(somePromise).rejects.toThrow("error")

// Good
expect(somePromise).rejects.toThrow("error")
```

### Type aliases for simple types

Do NOT create type aliases for simple types. Type aliases make grep searches ineffective.

```typescript
// Bad
type Organization = typeof organizationsTable.$inferSelect
type Expert = typeof expertsTable.$inferSelect

function createExpert(organization: Organization, expert: Expert) {}

// Good
function createExpert(
  organization: typeof organizationsTable.$inferSelect,
  expert: typeof expertsTable.$inferSelect,
) {}
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
