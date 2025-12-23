---
title: "Expert Jobs Workspace Instance API"
---

# Expert Jobs Workspace Instance

**Product:** studio
**Version:** v1

## Endpoints

- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-)
- [POST `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/`](#post-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-workspaceitemid-)
- [POST `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`](#post-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-workspaceitemid-)
- [DELETE `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`](#delete-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-workspaceitemid-)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}/download`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-workspaceitemid-download)
- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/find`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-items-find)

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/`

**Get workspace instance**

Retrieve the workspace instance associated with an expert job.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instance`

### Parameters

#### `expertJobId` (path)

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
|   workspaceInstance | object | Yes |  |
|     type | `"workspaceInstance"` | Yes |  |
|     id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     applicationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     application | object | Yes |  |
|       type | `"application"` | Yes |  |
|       id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       organization | object | Yes |  |
|         type | `"organization"` | Yes |  |
|         id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|         createdAt | string | Yes |  |
|         updatedAt | string | Yes |  |
|         name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|         nameChangedAt | string | No |  |
|         status | `active` \| `inactive` \| `deleted` | Yes |  |
|         organizationType | `personal` \| `personalPlus` \| `team` \| `serviceAdmin` | Yes |  |
|         maxApplications | number | Yes |  |
|         maxApiKeys | number | Yes |  |
|         maxStudioExperts | number | Yes |  |
|       createdAt | string | Yes |  |
|       updatedAt | string | Yes |  |
|       name | string | Yes |  |
|       status | `active` \| `inactive` \| `deleted` | Yes |  |
|     expertJob | object | Yes |  |
|       type | `"expertJob"` | Yes |  |
|       id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       createdAt | string | Yes |  |
|       updatedAt | string | Yes |  |
|       status | `queued` \| `processing` \| `completed` \| `requestInteractiveToolResult` \| `requestDelegateResult` \| `exceededMaxSteps` \| `failed` \| `canceling` \| `canceled` \| `expired` | Yes |  |
|       runtimeVersion | `"v1.0"` | Yes |  |
|       expertKey | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|       query | string | No |  |
|       files | string[] | Yes |  |
|       interactiveToolCallResult | boolean | No |  |
|       expert | union | Yes |  |
|       model | `claude-opus-4-5` \| `claude-opus-4-1` \| `claude-opus-4-20250514` \| `claude-sonnet-4-5` \| `claude-sonnet-4-20250514` \| `claude-3-7-sonnet-20250219` \| `claude-haiku-4-5` \| `claude-3-5-haiku-latest` \| `gemini-3-pro-preview` \| `gemini-2.5-pro` \| `gemini-2.5-flash` \| `gemini-2.5-flash-lite` \| `gpt-5` \| `gpt-5-mini` \| `gpt-5-nano` \| `gpt-5-chat-latest` \| `o4-mini` \| `o3` \| `o3-mini` \| `gpt-4.1` \| `deepseek-chat` \| `deepseek-reasoner` | Yes |  |
|       temperature | number | Yes |  |
|       maxSteps | number | Yes |  |
|       maxRetries | number | Yes |  |
|       currentStep | number | Yes |  |
|       totalSteps | number | Yes |  |
|       totalDuration | number | Yes |  |
|       usage | object | Yes |  |
|         inputTokens | number | Yes |  |
|         outputTokens | number | Yes |  |
|         reasoningTokens | number | Yes |  |
|         totalTokens | number | Yes |  |
|         cachedInputTokens | number | Yes |  |
|       applicationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |

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

Expert job or workspace instance not found.

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

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/`

**List workspace instance items**

List all items in the workspace instance. Includes both workspace defaults and expert job specific items.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItems`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `take` (query)

**Required**

**Type:** number
**Range:** min: 1, max: 100
**Default:** `100`

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
|   workspaceItems | unknown[] | Yes |  |
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

#### 422

Query or path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/`

**Create a workspace instance item**

Create a new file or directory in the workspace instance. Parent directory must exist.

**Operation ID:** `postApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItems`

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

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspaceItem | union | Yes |  |

#### 400

Bad Request. Possible reasons:
- Invalid path
- Directory not found

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

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`

**Get a workspace instance item**

Retrieve detailed information about a specific workspace instance item.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItemsByWorkspaceItemId`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `workspaceItemId` (path)

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
|   workspaceItem | union | Yes |  |

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

Workspace item not found.

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

## POST `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`

**Update a workspace instance item**

Update the lifecycle, permission, or path of a workspace instance item.

**Operation ID:** `postApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItemsByWorkspaceItemId`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `workspaceItemId` (path)

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
| lifecycle | `application` \| `expertJob` | No |  |
| permission | `readOnly` \| `readWrite` | No |  |
| path | string | No |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspaceItem | union | Yes |  |

#### 400

Bad Request. Possible reasons:
- At least one field is required
- Invalid path
- Directory not found
- Path already exists

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

#### 404

Workspace item not found.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `404` | Yes |  |
| error | `"Not Found"` | Yes |  |
| reason | string | Yes |  |

#### 422

Request body or path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## DELETE `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}`

**Delete a workspace instance item**

Delete a file or directory from the workspace instance. Deleting a directory also deletes all its contents.

**Operation ID:** `deleteApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItemsByWorkspaceItemId`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `workspaceItemId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

### Responses

#### 200

Response for status 200

**Content-Type:** `type`

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

Workspace item not found.

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

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/{workspaceItemId}/download`

**Download a workspace instance file**

Download the content of a file from the workspace instance.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItemsByWorkspaceItemIdDownload`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `workspaceItemId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

### Responses

#### 200

Response for status 200

**Content-Type:** `text/plain`

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

Not Found. Possible reasons:
- Workspace item not found
- File not found

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

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance/items/find`

**Find workspace instance items by path**

Find workspace instance items matching the specified path.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instanceItemsFind`

### Parameters

#### `expertJobId` (path)

**Required**

**Description:** A unique identifier for a resource
**Type:** string (pattern)
**Pattern:** `^[a-z0-9]+$`
**Length:** min: 24, max: 24
**Examples:** `test12345678901234567890`

#### `path` (query)

**Required**

**Type:** string
**Length:** min: 1

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspaceItems | unknown[] | Yes |  |

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

Query or path parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---
