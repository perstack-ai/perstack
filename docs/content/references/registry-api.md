# Registry API Reference

The Registry API provides endpoints for publishing, managing, and discovering Experts.

Base URL: `https://api.perstack.ai`

## Authentication

Some endpoints require authentication via API key:

```
Authorization: Bearer <API_KEY>
```

Obtain API keys from your organization dashboard.

## Endpoints

### List Experts

Returns a paginated list of published Experts with `latest` tag.

**Authentication:** Not required

```
GET /registry/experts
```

**Query Parameters:**

| Parameter        | Type   | Default | Description                                             |
| ---------------- | ------ | ------- | ------------------------------------------------------- |
| `organizationId` | string | —       | Filter by organization ID                               |
| `filter`         | string | —       | Filter by name prefix (case-insensitive)                |
| `sort`           | string | —       | Sort field: `name`, `version`, `createdAt`, `updatedAt` |
| `order`          | string | `desc`  | Sort order: `asc`, `desc`                               |
| `take`           | number | `100`   | Page size (1-100)                                       |
| `skip`           | number | `0`     | Offset for pagination                                   |

**Response:**

```json
{
  "data": {
    "experts": [
      {
        "type": "expertDigest",
        "id": "cuid",
        "key": "my-expert@1.0.0",
        "name": "my-expert",
        "version": "1.0.0",
        "minRuntimeVersion": "1.0.0",
        "description": "Expert description",
        "tags": ["latest"],
        "owner": {
          "name": "org-name",
          "organizationId": "cuid",
          "createdAt": "2024-01-01T00:00:00.000Z"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "meta": {
    "total": 50,
    "take": 100,
    "skip": 0
  }
}
```

---

### Get Expert

Returns full Expert details by key.

**Authentication:** Not required

```
GET /registry/experts/:expertKey
```

**Path Parameters:**

| Parameter   | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `expertKey` | Expert key (e.g., `my-expert`, `my-expert@1.0.0`, `@org/my-expert@latest`) |

**Response:**

```json
{
  "data": {
    "expert": {
      "type": "registryExpert",
      "id": "cuid",
      "key": "my-expert@1.0.0",
      "name": "my-expert",
      "version": "1.0.0",
      "status": "available",
      "minRuntimeVersion": "1.0.0",
      "description": "Expert description",
      "instruction": "You are an expert that...",
      "skills": {
        "@perstack/base": {
          "type": "mcpStdioSkill",
          "description": "Base skill",
          "command": "npx",
          "packageName": "@perstack/base"
        }
      },
      "delegates": ["other-expert@1.0.0"],
      "tags": ["latest"],
      "owner": {
        "name": "org-name",
        "organizationId": "cuid",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### Get Expert Versions

Returns all versions of an Expert.

**Authentication:** Not required

```
GET /registry/experts/:expertKey/versions
```

**Path Parameters:**

| Parameter   | Description                             |
| ----------- | --------------------------------------- |
| `expertKey` | Expert key (name only, version ignored) |

**Response:**

```json
{
  "data": {
    "versions": [
      {
        "type": "expertDigest",
        "id": "cuid",
        "key": "my-expert@2.0.0",
        "name": "my-expert",
        "version": "2.0.0",
        "tags": ["latest"]
      },
      {
        "type": "expertDigest",
        "id": "cuid",
        "key": "my-expert@1.0.0",
        "name": "my-expert",
        "version": "1.0.0",
        "tags": []
      }
    ],
    "latest": "2.0.0"
  },
  "meta": {
    "total": 2
  }
}
```

---

### Publish Expert

Creates a new Expert version.

**Authentication:** Required

```
POST /registry/experts
```

**Request Body:**

| Field               | Type   | Required | Description                                       |
| ------------------- | ------ | -------- | ------------------------------------------------- |
| `name`              | string | Yes      | Expert name (e.g., `my-expert`, `@org/my-expert`) |
| `version`           | string | Yes      | Semantic version (e.g., `1.0.0`)                  |
| `minRuntimeVersion` | string | Yes      | Minimum runtime version                           |
| `description`       | string | Yes      | Short description                                 |
| `instruction`       | string | Yes      | System instruction for the Expert                 |
| `skills`            | object | Yes      | Skill definitions (must include `@perstack/base`) |
| `delegates`         | array  | No       | Expert keys to delegate to                        |
| `tags`              | array  | No       | Custom tags (cannot include `latest`)             |

**Latest Tag Management:**

The `latest` tag is automatically assigned to newly published versions and cannot be manually set. When you publish a new version:
- The `latest` tag is automatically moved from the previous version to the new version
- You can only set custom tags (other than `latest`) via the `tags` field

**Skill Types:**

MCP Stdio Skill:

```json
{
  "type": "mcpStdioSkill",
  "description": "Skill description",
  "rule": "Usage rules (optional)",
  "command": "npx",
  "packageName": "@scope/package@version",
  "pick": ["tool1", "tool2"],
  "omit": ["tool3"],
  "requiredEnv": ["API_KEY"]
}
```

MCP SSE Skill:

```json
{
  "type": "mcpSseSkill",
  "description": "Skill description",
  "rule": "Usage rules (optional)",
  "endpoint": "https://api.example.com/sse",
  "pick": ["tool1"],
  "omit": []
}
```

Interactive Skill:

```json
{
  "type": "interactiveSkill",
  "description": "Skill description",
  "rule": "Usage rules (optional)",
  "tools": {
    "toolName": {
      "description": "Tool description",
      "inputJsonSchema": "{\"type\":\"object\",...}"
    }
  }
}
```

**Example Request:**

```json
{
  "name": "my-expert",
  "version": "1.0.0",
  "minRuntimeVersion": "1.0.0",
  "description": "An expert that does X",
  "instruction": "You are an expert that helps users with X.",
  "skills": {
    "@perstack/base": {
      "type": "mcpStdioSkill",
      "description": "Base filesystem and shell tools",
      "command": "npx",
      "packageName": "@perstack/base@latest"
    }
  },
  "delegates": [],
  "tags": ["stable"]
}
```

**Response:** Same as Get Expert.

**Naming Rules:**

- Personal/Personal Plus accounts: unscoped names only (e.g., `my-expert`)
- Team accounts: scoped names required (e.g., `@org/my-expert`)

---

### Update Expert

Updates Expert status or tags.

**Authentication:** Required

```
POST /registry/experts/:expertKey
```

**Path Parameters:**

| Parameter   | Description |
| ----------- | ----------- |
| `expertKey` | Expert key  |

**Request Body:**

| Field    | Type   | Description                                       |
| -------- | ------ | ------------------------------------------------- |
| `status` | string | New status: `available`, `deprecated`, `disabled` |
| `tags`   | array  | New tags for this version                         |

**Status Transitions:**

- `available` → `deprecated` ✓
- `available` → `disabled` ✓
- `deprecated` → `disabled` ✓
- `deprecated` → `available` ✗
- `disabled` → any ✗

**Tag Rules:**

- Cannot manually set or modify the `latest` tag
- The `latest` tag is automatically managed by the system
- You can only add or remove custom tags (not `latest`)

**Example Request:**

```json
{
  "status": "deprecated",
  "tags": ["legacy", "v1"]
}
```

Note: The `latest` tag cannot be included in the `tags` array.

---

### Delete Expert

Deletes an Expert version.

**Authentication:** Required

```
DELETE /registry/experts/:expertKey
```

**Path Parameters:**

| Parameter   | Description |
| ----------- | ----------- |
| `expertKey` | Expert key  |

**Constraints:**

- Cannot delete if other Experts delegate to this one
- Only organization owner can delete

**Latest Tag Handling:**

When deleting an Expert version that has the `latest` tag:
- If other versions exist: the `latest` tag is automatically moved to the next most recent version
- If no other versions exist: the `latest` tag is deleted along with the Expert

**Response:** `200 OK` with empty body.

---

## Expert Key Format

Expert keys follow this pattern:

```
[@scope/]name[@version|tag]
```

| Example                | Description                |
| ---------------------- | -------------------------- |
| `my-expert`            | Unscoped, latest version   |
| `my-expert@1.0.0`      | Unscoped, specific version |
| `my-expert@latest`     | Unscoped, latest tag       |
| `@org/my-expert`       | Scoped, latest version     |
| `@org/my-expert@2.0.0` | Scoped, specific version   |

## Error Responses

| Status | Description                                                 |
| ------ | ----------------------------------------------------------- |
| `400`  | Bad Request — Invalid parameters or business rule violation |
| `401`  | Unauthorized — Missing or invalid authentication            |
| `404`  | Not Found — Expert does not exist                           |

