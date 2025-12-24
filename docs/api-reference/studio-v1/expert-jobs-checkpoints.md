---
title: "Expert Jobs Checkpoints API"
---

# Expert Jobs Checkpoints

**Product:** studio
**Version:** v1

## Endpoints

- [GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/{checkpointId}`](#get-api-studio-v1-expert-jobs-expertjobid-checkpoints-checkpointid-)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/`](#get-api-studio-v1-expert-jobs-expertjobid-checkpoints-)
- [POST `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/`](#post-api-studio-v1-expert-jobs-expertjobid-checkpoints-)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/stream`](#get-api-studio-v1-expert-jobs-expertjobid-checkpoints-stream)

## GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/{checkpointId}`

**Get a checkpoint**

Retrieve detailed information about a specific checkpoint including messages and tool calls.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdCheckpointsByCheckpointId`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `checkpointId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   checkpoint | object | Yes |  |
|     type | `"checkpoint"` | Yes |  |
|     id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     action | union | Yes |  |
|     runId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     expertJobId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     stepNumber | number | Yes |  |
|     status | `init` \| `proceeding` \| `completed` \| `stoppedByInteractiveTool` \| `stoppedByDelegate` \| `stoppedByExceededMaxSteps` \| `stoppedByError` | Yes |  |
|     expert | object | Yes |  |
|       type | `"expertDigest"` | Yes |  |
|       id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|       name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|       minRuntimeVersion | `"v1.0"` | Yes |  |
|       description | string | Yes | Brief description of what the expert does |
|       owner | object | Yes | Organization that owns this expert |
|         name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|         organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         createdAt | string | Yes |  |
|       createdAt | string | Yes | Creation timestamp |
|       updatedAt | string | Yes | Last update timestamp |
|       version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|       tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|     skillName | string | No |  |
|     toolName | string | No |  |
|     delegateTo | object | No |  |
|       expert | object | Yes |  |
|         type | `"expertDigest"` | Yes |  |
|         id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|         name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|         minRuntimeVersion | `"v1.0"` | Yes |  |
|         description | string | Yes | Brief description of what the expert does |
|         owner | object | Yes | Organization that owns this expert |
|           name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|           organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|           createdAt | string | Yes |  |
|         createdAt | string | Yes | Creation timestamp |
|         updatedAt | string | Yes | Last update timestamp |
|         version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|         tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|       toolCallId | string | Yes |  |
|       toolName | string | Yes |  |
|     delegatedBy | object | No |  |
|       expert | object | Yes |  |
|         type | `"expertDigest"` | Yes |  |
|         id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|         name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|         minRuntimeVersion | `"v1.0"` | Yes |  |
|         description | string | Yes | Brief description of what the expert does |
|         owner | object | Yes | Organization that owns this expert |
|           name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|           organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|           createdAt | string | Yes |  |
|         createdAt | string | Yes | Creation timestamp |
|         updatedAt | string | Yes | Last update timestamp |
|         version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|         tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|       toolCallId | string | Yes |  |
|       toolName | string | Yes |  |
|       checkpointId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     inputMessages | unknown[] | No |  |
|     messages | unknown[] | Yes |  |
|     newMessages | unknown[] | Yes |  |
|     toolCall | object | No |  |
|       id | string | Yes |  |
|       skillName | string | Yes |  |
|       toolName | string | Yes |  |
|       args | object | Yes |  |
|     toolResult | object | No |  |
|       id | string | Yes |  |
|       skillName | string | Yes |  |
|       toolName | string | Yes |  |
|       result | unknown[] | Yes |  |
|     usage | object | Yes |  |
|       inputTokens | number | Yes |  |
|       outputTokens | number | Yes |  |
|       reasoningTokens | number | Yes |  |
|       totalTokens | number | Yes |  |
|       cachedInputTokens | number | Yes |  |
|     contextWindow | number | No |  |
|     contextWindowUsage | number | No |  |
|     startedAt | string | Yes |  |
|     finishedAt | string | No |  |

#### 401

Authentication failed. Possible reasons:
- Authorization header is not provided
- Invalid API key
- Application not found

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `401` | Yes |  |
| error | `"Unauthorized"` | Yes |  |
| reason | `"Failed to authenticate"` | Yes |  |

#### 404

Checkpoint not found.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `404` | Yes |  |
| error | `"Not Found"` | Yes |  |
| reason | string | Yes |  |

#### 422

Path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/`

**List checkpoints**

List all checkpoints for a specific expert job. Supports sorting and pagination.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdCheckpoints`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `filter` (query)

**Type:** string
**Length:** min: 1, max: 256

#### `sort` (query)

**Type:** enum
**Values:** `createdAt`, `updatedAt`

#### `order` (query)

**Type:** enum
**Values:** `asc`, `desc`

#### `take` (query)

**Required**

**Type:** number
**Range:** min: 1, max: 100
**Default:** `10`

#### `skip` (query)

**Required**

**Type:** number
**Range:** min: 0
**Default:** `0`

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   checkpoints | object[] | Yes |  |
| meta | object | Yes |  |
|   total | number | Yes |  |
|   take | number | Yes |  |
|   skip | number | Yes |  |

#### 401

Authentication failed. Possible reasons:
- Authorization header is not provided
- Invalid API key
- Application not found

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `401` | Yes |  |
| error | `"Unauthorized"` | Yes |  |
| reason | `"Failed to authenticate"` | Yes |  |

#### 404

Expert job not found.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `404` | Yes |  |
| error | `"Not Found"` | Yes |  |
| reason | string | Yes |  |

#### 422

Query or path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/`

**Create a checkpoint**

Create a new checkpoint for an expert job. Internal API called by the expert job runtime.

**Operation ID:** `postApiStudioV1Expert_jobsByExpertJobIdCheckpoints`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| checkpoint | object | Yes |  |
|   status | `init` \| `proceeding` \| `completed` \| `stoppedByInteractiveTool` \| `stoppedByDelegate` \| `stoppedByExceededMaxSteps` \| `stoppedByError` | Yes |  |
|   stepNumber | number | Yes |  |
|   messages | unknown[] | Yes |  |
|   expert | object | Yes |  |
|     key | string | Yes |  |
|     name | string | Yes |  |
|     version | string | Yes |  |
|   delegateTo | object | No |  |
|     expert | object | Yes |  |
|       key | string | Yes |  |
|       name | string | Yes |  |
|       version | string | Yes |  |
|     toolCallId | string | Yes |  |
|     toolName | string | Yes |  |
|     query | string | Yes |  |
|   delegatedBy | object | No |  |
|     expert | object | Yes |  |
|       key | string | Yes |  |
|       name | string | Yes |  |
|       version | string | Yes |  |
|     toolCallId | string | Yes |  |
|     toolName | string | Yes |  |
|     checkpointId | string | Yes |  |
|   usage | object | Yes |  |
|     inputTokens | number | Yes |  |
|     outputTokens | number | Yes |  |
|     reasoningTokens | number | Yes |  |
|     totalTokens | number | Yes |  |
|     cachedInputTokens | number | Yes |  |
|   contextWindow | number | No |  |
|   contextWindowUsage | number | No |  |
| step | object | Yes |  |
|   stepNumber | number | Yes |  |
|   inputMessages | unknown[] | No |  |
|   newMessages | unknown[] | Yes |  |
|   toolCall | object | No |  |
|     id | string | Yes |  |
|     skillName | string | Yes |  |
|     toolName | string | Yes |  |
|     args | object | Yes |  |
|   toolResult | object | No |  |
|     id | string | Yes |  |
|     skillName | string | Yes |  |
|     toolName | string | Yes |  |
|     result | unknown[] | Yes |  |
|   usage | object | Yes |  |
|     inputTokens | number | Yes |  |
|     outputTokens | number | Yes |  |
|     reasoningTokens | number | Yes |  |
|     totalTokens | number | Yes |  |
|     cachedInputTokens | number | Yes |  |
|   startedAt | number | Yes |  |
|   finishedAt | number | No |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   checkpoint | object | Yes |  |
|     type | `"checkpoint"` | Yes |  |
|     id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     action | union | Yes |  |
|     runId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     expertJobId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     stepNumber | number | Yes |  |
|     status | `init` \| `proceeding` \| `completed` \| `stoppedByInteractiveTool` \| `stoppedByDelegate` \| `stoppedByExceededMaxSteps` \| `stoppedByError` | Yes |  |
|     expert | object | Yes |  |
|       type | `"expertDigest"` | Yes |  |
|       id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|       name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|       minRuntimeVersion | `"v1.0"` | Yes |  |
|       description | string | Yes | Brief description of what the expert does |
|       owner | object | Yes | Organization that owns this expert |
|         name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|         organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         createdAt | string | Yes |  |
|       createdAt | string | Yes | Creation timestamp |
|       updatedAt | string | Yes | Last update timestamp |
|       version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|       tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|     skillName | string | No |  |
|     toolName | string | No |  |
|     delegateTo | object | No |  |
|       expert | object | Yes |  |
|         type | `"expertDigest"` | Yes |  |
|         id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|         name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|         minRuntimeVersion | `"v1.0"` | Yes |  |
|         description | string | Yes | Brief description of what the expert does |
|         owner | object | Yes | Organization that owns this expert |
|           name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|           organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|           createdAt | string | Yes |  |
|         createdAt | string | Yes | Creation timestamp |
|         updatedAt | string | Yes | Last update timestamp |
|         version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|         tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|       toolCallId | string | Yes |  |
|       toolName | string | Yes |  |
|     delegatedBy | object | No |  |
|       expert | object | Yes |  |
|         type | `"expertDigest"` | Yes |  |
|         id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|         name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|         minRuntimeVersion | `"v1.0"` | Yes |  |
|         description | string | Yes | Brief description of what the expert does |
|         owner | object | Yes | Organization that owns this expert |
|           name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|           organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|           createdAt | string | Yes |  |
|         createdAt | string | Yes | Creation timestamp |
|         updatedAt | string | Yes | Last update timestamp |
|         version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | No | Semantic version of the expert |
|         tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |
|       toolCallId | string | Yes |  |
|       toolName | string | Yes |  |
|       checkpointId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     inputMessages | unknown[] | No |  |
|     messages | unknown[] | Yes |  |
|     newMessages | unknown[] | Yes |  |
|     toolCall | object | No |  |
|       id | string | Yes |  |
|       skillName | string | Yes |  |
|       toolName | string | Yes |  |
|       args | object | Yes |  |
|     toolResult | object | No |  |
|       id | string | Yes |  |
|       skillName | string | Yes |  |
|       toolName | string | Yes |  |
|       result | unknown[] | Yes |  |
|     usage | object | Yes |  |
|       inputTokens | number | Yes |  |
|       outputTokens | number | Yes |  |
|       reasoningTokens | number | Yes |  |
|       totalTokens | number | Yes |  |
|       cachedInputTokens | number | Yes |  |
|     contextWindow | number | No |  |
|     contextWindowUsage | number | No |  |
|     startedAt | string | Yes |  |
|     finishedAt | string | No |  |

#### 400

Bad Request. Expert not found.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `400` | Yes |  |
| error | `"Bad Request"` | Yes |  |
| reason | string | Yes |  |

#### 401

Authentication failed. Possible reasons:
- Authorization header is not provided
- Invalid API key
- Application not found

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `401` | Yes |  |
| error | `"Unauthorized"` | Yes |  |
| reason | `"Failed to authenticate"` | Yes |  |

#### 422

Request body or path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## GET `/api/studio/v1/expert_jobs/{expertJobId}/checkpoints/stream`

**Stream checkpoints**

Stream checkpoints in real-time via Server-Sent Events (SSE) as an expert job executes.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdCheckpointsStream`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

### SSE Event Types

The stream emits three types of events:

#### `message` event

Emitted for each checkpoint. Data is a checkpoint object with the same structure as the GET checkpoint response.

#### `error` event

Emitted when an error occurs during streaming.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| type | string | Yes | Error type |
| expertJobId | string | Yes | The expert job ID |
| message | string | No | Error message |
| checkpointId | string | No | Checkpoint ID if applicable |

#### `complete` event

Emitted when the job completes.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| status | string | Yes | Final job status |
| expertJobId | string | Yes | The expert job ID |

### Client Usage

Using `@perstack/api-client`:

```typescript
import { createPerstackClient } from "@perstack/api-client"

const client = createPerstackClient({ apiKey: "your-api-key" })

for await (const event of client.studio.expertJobs.checkpoints.stream(jobId)) {
  if (event.event === "message") {
    console.log("Checkpoint:", event.data.action.type)
  } else if (event.event === "error") {
    console.error("Error:", event.data.message)
  } else if (event.event === "complete") {
    console.log("Completed with status:", event.data.status)
  }
}
```

### Responses

#### 401

Authentication failed. Possible reasons:
- Authorization header is not provided
- Invalid API key
- Application not found

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `401` | Yes |  |
| error | `"Unauthorized"` | Yes |  |
| reason | `"Failed to authenticate"` | Yes |  |

#### 404

Expert job not found.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `404` | Yes |  |
| error | `"Not Found"` | Yes |  |
| reason | string | Yes |  |

#### 422

Path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---
