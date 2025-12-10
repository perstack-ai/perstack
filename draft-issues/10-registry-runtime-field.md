---
title: "Add: Registry support for `runtime` field"
labels: ["multi-runtime", "api-client", "registry"]
---

## Overview

Add support for the `runtime` field in the Registry API, allowing published Experts to declare their target runtimes.

## Background

Published Experts should be able to declare which runtimes they support:

```toml
[experts."my-expert"]
runtime = ["perstack", "cursor", "claude-code"]
instruction = "..."
```

When users run a registry Expert:
- Default behavior: use runtime from Expert definition
- With `--runtime` flag: override to specific runtime

## Implementation

### 1. Update API Client Expert Schema

**File:** `packages/api-client/v1/schemas/expert.ts`

Add `runtime` field to registry expert schemas:

```typescript
import { runtimeNameSchema } from "@perstack/core"

export const apiRegistryExpertSchema = apiBaseExpertSchema.extend({
  type: z.literal("registryExpert"),
  version: apiExpertVersionSchema,
  status: z.union([z.literal("available"), z.literal("deprecated"), z.literal("disabled")]),
  instruction: z.string().min(1).max(maxExpertInstructionLength),
  skills: z.record(apiSkillNameSchema, apiSkillSchema),
  delegates: z.array(apiBaseExpertSchema.shape.key),
  tags: z.array(apiTagNameSchema),
  runtime: z
    .union([runtimeNameSchema, z.array(runtimeNameSchema)])
    .optional()
    .default(["perstack"])
    .transform((value) => (typeof value === "string" ? [value] : value)),
})
```

### 2. Update Registry Expert Creation

**File:** `packages/api-client/v1/registry/experts.ts`

Add `runtime` to create input:

```typescript
const createRegistryExpertInput = z.object({
  name: apiRegistryExpertSchema.shape.name,
  version: apiRegistryExpertSchema.shape.version,
  minRuntimeVersion: apiRegistryExpertSchema.shape.minRuntimeVersion,
  description: apiRegistryExpertSchema.shape.description,
  instruction: apiRegistryExpertSchema.shape.instruction,
  skills: apiRegistryExpertSchema.shape.skills,
  delegates: apiRegistryExpertSchema.shape.delegates,
  tags: apiRegistryExpertSchema.shape.tags,
  runtime: apiRegistryExpertSchema.shape.runtime, // Add this
})

export async function createRegistryExpert(
  input: CreateRegistryExpertInput,
  client: ApiV1Client,
): Promise<{ expert: ApiRegistryExpert }> {
  const {
    name,
    version,
    minRuntimeVersion,
    description,
    instruction,
    skills,
    delegates,
    tags,
    runtime, // Add this
  } = createRegistryExpertInput.parse(input)
  
  const endpoint = "/api/registry/v1/experts"
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      version,
      minRuntimeVersion,
      description,
      instruction,
      skills,
      delegates,
      tags,
      runtime, // Add this
    }),
  })
  // ...
}
```

### 3. Update Publish Command

**File:** `packages/perstack/src/publish.ts`

Include `runtime` field when publishing:

```typescript
const expertConfig = perstackConfig.experts?.[expertName]
if (!expertConfig) {
  throw new Error(`Expert "${expertName}" not found in config`)
}

const runtime = expertConfig.runtime ?? ["perstack"]

await createRegistryExpert({
  name: expertName,
  version: expertConfig.version ?? "1.0.0",
  // ... other fields ...
  runtime,
}, client)
```

### 4. Update Test Data

**File:** `packages/api-client/test/test-data.ts`

Add runtime to test experts:

```typescript
export const testRegistryExpert: ApiRegistryExpert = {
  // ... existing fields ...
  runtime: ["perstack"],
}
```

## Affected Files

| File                                         | Change                             |
| -------------------------------------------- | ---------------------------------- |
| `packages/api-client/v1/schemas/expert.ts`   | Add `runtime` field to schema      |
| `packages/api-client/v1/registry/experts.ts` | Include `runtime` in create/update |
| `packages/perstack/src/publish.ts`           | Send `runtime` when publishing     |
| `packages/api-client/test/test-data.ts`      | Add `runtime` to test data         |

## Testing

### Unit Tests

Update `packages/api-client/v1/registry/experts.test.ts`:

```typescript
describe("createRegistryExpert", () => {
  it("sends runtime field in request", async () => {
    const input = {
      name: "test-expert",
      version: "1.0.0",
      // ... other fields ...
      runtime: ["perstack", "cursor"],
    }
    
    // Mock and verify request includes runtime
  })

  it("defaults runtime to perstack", async () => {
    const input = {
      name: "test-expert",
      version: "1.0.0",
      // ... other fields, no runtime ...
    }
    
    // Mock and verify request includes runtime: ["perstack"]
  })
})
```

### E2E Tests

Update `e2e/publish.test.ts`:

```typescript
describe("publish with runtime", () => {
  it("should include runtime in dry-run output", async () => {
    const result = await runCli([
      "publish",
      "--config",
      "./e2e/experts/cli-commands.toml",
      "test-expert",
      "--dry-run",
    ])
    
    expect(result.stdout).toContain("runtime")
  })
})
```

## Documentation

Update `docs/content/references/registry-api.mdx`:

Add to **Publish Expert** section:

```markdown
| `runtime` | array | No | Target runtimes (default: `["perstack"]`) |
```

Add example:

```json
{
  "name": "my-expert",
  "version": "1.0.0",
  // ...
  "runtime": ["perstack", "cursor", "claude-code"]
}
```

## Acceptance Criteria

- [ ] `runtime` field added to `apiRegistryExpertSchema`
- [ ] `runtime` field sent in create expert request
- [ ] `runtime` field returned in get expert response
- [ ] Default value is `["perstack"]` when not specified
- [ ] Publish command includes `runtime` from config
- [ ] Unit tests pass
- [ ] E2E dry-run test passes
- [ ] Registry API documentation updated
- [ ] `pnpm typecheck` passes

## Dependencies

- #01 Core schema `runtime` field

## Blocked By

- #01 Core schema `runtime` field

## Blocks

- #12 Documentation Update
