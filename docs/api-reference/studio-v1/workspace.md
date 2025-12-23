---
title: "Workspace API"
---

# Workspace

**Product:** studio
**Version:** v1

## Endpoints

- [GET `/api/studio/v1/workspace/`](#get-api-studio-v1-workspace-)
- [GET `/api/studio/v1/workspace/items/`](#get-api-studio-v1-workspace-items-)
- [POST `/api/studio/v1/workspace/items/`](#post-api-studio-v1-workspace-items-)
- [GET `/api/studio/v1/workspace/items/{workspaceItemId}`](#get-api-studio-v1-workspace-items-workspaceitemid-)
- [POST `/api/studio/v1/workspace/items/{workspaceItemId}`](#post-api-studio-v1-workspace-items-workspaceitemid-)
- [DELETE `/api/studio/v1/workspace/items/{workspaceItemId}`](#delete-api-studio-v1-workspace-items-workspaceitemid-)
- [GET `/api/studio/v1/workspace/items/{workspaceItemId}/download`](#get-api-studio-v1-workspace-items-workspaceitemid-download)
- [GET `/api/studio/v1/workspace/items/find`](#get-api-studio-v1-workspace-items-find)
- [POST `/api/studio/v1/workspace/secrets/`](#post-api-studio-v1-workspace-secrets-)
- [DELETE `/api/studio/v1/workspace/secrets/{envSecretName}`](#delete-api-studio-v1-workspace-secrets-envsecretname-)
- [POST `/api/studio/v1/workspace/variables/`](#post-api-studio-v1-workspace-variables-)
- [POST `/api/studio/v1/workspace/variables/{envVariableName}`](#post-api-studio-v1-workspace-variables-envvariablename-)
- [DELETE `/api/studio/v1/workspace/variables/{envVariableName}`](#delete-api-studio-v1-workspace-variables-envvariablename-)

## GET `/api/studio/v1/workspace/`

**Get workspace**

Retrieve the workspace associated with the application. A workspace is the default file storage area.

**Operation ID:** `getApiStudioV1Workspace`

### Parameters

#### `expertJobId` (query)

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
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

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

Query parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## GET `/api/studio/v1/workspace/items/`

**List workspace items**

List all items in the workspace with pagination support.

**Operation ID:** `getApiStudioV1WorkspaceItems`

### Parameters

#### `applicationId` (query)

**Type:** string

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

Query parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/studio/v1/workspace/items/`

**Create a workspace item**

Create a new file or directory in the workspace. Parent directory must exist.

**Operation ID:** `postApiStudioV1WorkspaceItems`

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

#### 422

Request body schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## GET `/api/studio/v1/workspace/items/{workspaceItemId}`

**Get a workspace item**

Retrieve detailed information about a specific workspace item.

**Operation ID:** `getApiStudioV1WorkspaceItemsByWorkspaceItemId`

### Parameters

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

## POST `/api/studio/v1/workspace/items/{workspaceItemId}`

**Update a workspace item**

Update the lifecycle, permission, or path of a workspace item.

**Operation ID:** `postApiStudioV1WorkspaceItemsByWorkspaceItemId`

### Parameters

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

## DELETE `/api/studio/v1/workspace/items/{workspaceItemId}`

**Delete a workspace item**

Delete a file or directory from the workspace. Deleting a directory also deletes all its contents.

**Operation ID:** `deleteApiStudioV1WorkspaceItemsByWorkspaceItemId`

### Parameters

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

## GET `/api/studio/v1/workspace/items/{workspaceItemId}/download`

**Download a workspace file**

Download the content of a file from the workspace.

**Operation ID:** `getApiStudioV1WorkspaceItemsByWorkspaceItemIdDownload`

### Parameters

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

#### 400

Bad Request. Can only download files, not directories.

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

## GET `/api/studio/v1/workspace/items/find`

**Find workspace items by path**

Find workspace items matching the specified path.

**Operation ID:** `getApiStudioV1WorkspaceItemsFind`

### Parameters

#### `applicationId` (query)

**Type:** string

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

Query parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/studio/v1/workspace/secrets/`

**Create a workspace secret**

Create an encrypted environment secret in the workspace. Secrets are available to expert jobs as environment variables.

**Operation ID:** `postApiStudioV1WorkspaceSecrets`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string (pattern: `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`) | Yes |  |
| value | string | Yes |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

#### 400

Bad Request. Env name already exists in workspace.

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

Request body schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## DELETE `/api/studio/v1/workspace/secrets/{envSecretName}`

**Delete a workspace secret**

Delete an encrypted environment secret from the workspace.

**Operation ID:** `deleteApiStudioV1WorkspaceSecretsByEnvSecretName`

### Parameters

#### `envSecretName` (path)

**Required**

**Type:** string (pattern)
**Pattern:** `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`
**Length:** min: 1, max: 256

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

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

Env secret not found.

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

## POST `/api/studio/v1/workspace/variables/`

**Create a workspace variable**

Create an environment variable in the workspace. Variables are available to expert jobs as environment variables.

**Operation ID:** `postApiStudioV1WorkspaceVariables`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string (pattern: `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`) | Yes |  |
| value | string | Yes |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

#### 400

Bad Request. Env name already exists in workspace.

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

Request body schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/studio/v1/workspace/variables/{envVariableName}`

**Update a workspace variable**

Update the name or value of an environment variable in the workspace.

**Operation ID:** `postApiStudioV1WorkspaceVariablesByEnvVariableName`

### Parameters

#### `envVariableName` (path)

**Required**

**Type:** string (pattern)
**Pattern:** `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`
**Length:** min: 1, max: 256

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string (pattern: `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`) | No |  |
| value | string | No |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

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

Env variable not found.

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

## DELETE `/api/studio/v1/workspace/variables/{envVariableName}`

**Delete a workspace variable**

Delete an environment variable from the workspace.

**Operation ID:** `deleteApiStudioV1WorkspaceVariablesByEnvVariableName`

### Parameters

#### `envVariableName` (path)

**Required**

**Type:** string (pattern)
**Pattern:** `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`
**Length:** min: 1, max: 256

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   workspace | object | Yes |  |
|     type | `"workspace"` | Yes |  |
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
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     items | unknown[] | Yes |  |
|     countItems | number | Yes |  |
|     envVariables | string[] | Yes |  |
|     envSecrets | string[] | Yes |  |
|     countWorkspaceInstances | number | Yes |  |

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

Env variable not found.

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
