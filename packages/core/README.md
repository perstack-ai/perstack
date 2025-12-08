# @perstack/core

Centralized schema definitions and type contracts for the Perstack monorepo.

## Installation

```bash
npm install @perstack/core
```

## Usage

### Validation

```typescript
import { expertSchema, type Expert } from "@perstack/core"
const expert = expertSchema.parse(data)
```

### Extending Core Schemas

When a package needs to add package-specific fields, extend the core schema:
```typescript
import { expertSchema } from "@perstack/core"
import { z } from "zod"
export const apiExpertSchema = expertSchema.omit({
  skills: true,
  delegates: true
}).extend({
  id: z.cuid2(),
  createdAt: z.date(),
  updatedAt: z.date()
})
```

## Package Responsibilities

1. **Single Source of Truth**: All cross-package schemas live here.
2. **Version as Contract**: `major.minor` tracks interface changes; `patch` tracks fixes.
3. **Sync Updates**: Dependent packages must update in sync with `core` version changes.

### What Core Should Contain

1. **Package Boundary Schemas**: Type definitions for data that crosses package boundaries, for example:
    - `Expert` - Expert definitions shared between runtime, api-client, and other packages
    - `Skill` - Skill configurations used across the system
    - `Message`, `ToolCall`, `ToolResult` - Runtime execution types

2. **Domain Common Types**: Types that represent core domain concepts used throughout the system, for example:
    - `Job` - Top-level execution unit containing Runs
    - `Run` - Single Expert execution within a Job
    - `Checkpoint` - Execution state snapshots
    - `Usage` - Resource usage tracking
    - `ProviderConfig` - LLM provider configurations

3. **Configuration Schemas**: System-wide configuration structures, for example:
    - `PerstackToml` - Project configuration file schema
    - `JobSetting` - Job execution parameters
    - `RunSetting` - Run execution parameters

### Execution Hierarchy

```
Job
 ├── Run (Coordinator Expert)
 │    └── Checkpoints...
 ├── Run (Delegated Expert A)
 │    └── Checkpoints...
 └── Run (Delegated Expert B)
      └── Checkpoints...
```

| Schema       | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| `Job`        | Top-level execution unit. Contains all Runs for a task.               |
| `Run`        | Single Expert execution. Created for Coordinator and each delegation. |
| `Checkpoint` | Snapshot at step end within a Run.                                    |

### What Core Should NOT Contain

1. **Package-Internal Types**: Implementation details that don't cross package boundaries should remain in their respective packages.

2. **Package-Specific Business Logic**: Core contains type definitions only. Business logic, utilities, and implementations belong in their respective packages.

3. **API-Specific Extensions**: API response/request schemas with API-specific metadata (ids, timestamps, pagination) should extend core schemas in `@perstack/api-client`.

4. **Tool Input Schemas (Exception)**: The `@perstack/base` package is an exception. Tool input schemas are defined inline for MCP SDK registration and don't cross package boundaries. This is documented in the type management guidelines.

## Schema Change Rules

### Patch Version (x.y.Z)

1. **Allowed Changes:**
    - Bug fixes in schema validation logic
    - Performance improvements
    - Documentation updates
    - Internal refactoring that doesn't affect exported schemas

2. **Prohibited Changes:**
    - Any changes to schema definitions
    - Adding or removing fields (even optional ones)
    - Changing validation rules

### Minor Version (x.Y.0)

1. **Allowed Changes:**
    - Adding new optional fields to existing schemas
    - Adding new schemas
    - Deprecating (but not removing) existing fields
    - Expanding validation rules (making them less strict)

2. **Required Actions:**
    - All dependent packages must bump their minor versions
    - Update CHANGELOG.md with migration guide if needed

### Major Version (X.0.0)

1. **Breaking Changes:**
    - Removing fields
    - Changing field types
    - Making optional fields required
    - Renaming schemas or fields
    - Tightening validation rules

2. **Required Actions:**
    - All dependent packages must bump their major versions
    - Comprehensive migration guide required
    - Consider providing deprecation warnings

## Related Documentation

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Version management rules and changeset workflow
