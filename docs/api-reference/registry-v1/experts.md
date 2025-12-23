---
title: "Experts API"
---

# Experts

**Product:** registry
**Version:** v1

## Endpoints

- [GET `/api/registry/v1/experts/{expertKey}`](#get-api-registry-v1-experts-expertkey-)
- [POST `/api/registry/v1/experts/{expertKey}`](#post-api-registry-v1-experts-expertkey-)
- [DELETE `/api/registry/v1/experts/{expertKey}`](#delete-api-registry-v1-experts-expertkey-)
- [GET `/api/registry/v1/experts/`](#get-api-registry-v1-experts-)
- [POST `/api/registry/v1/experts/`](#post-api-registry-v1-experts-)

## GET `/api/registry/v1/experts/{expertKey}`

**Get an expert**

Retrieve detailed information about a specific expert version from the Registry. Accepts expert key format (name@version or name@tag).

**Operation ID:** `getApiRegistryV1ExpertsByExpertKey`

### Parameters

#### `expertKey` (path)

**Required**

**Description:** Unique identifier for an expert version (name@version or name@tag)
**Type:** string (pattern)
**Pattern:** `^((?:@[a-z0-9][a-z0-9_.-]*\/)?[a-z0-9][a-z0-9_.-]*)(?:@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?)|@([a-z0-9][a-z0-9_.-]*))?$`
**Length:** min: 1, max: 511
**Examples:** `my-expert@1.0.0`, `@perstack/base@latest`

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   expert | object | Yes |  |
|     type | `"registryExpert"` | Yes |  |
|     id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     key | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|     name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
|     minRuntimeVersion | `"v1.0"` | Yes |  |
|     description | string | Yes | Brief description of what the expert does |
|     owner | object | Yes | Organization that owns this expert |
|       name | string (pattern: `^[a-z0-9][a-z0-9_.-]*$`) | No |  |
|       organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|       createdAt | string | Yes |  |
|     createdAt | string | Yes | Creation timestamp |
|     updatedAt | string | Yes | Last update timestamp |
|     version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | Yes | Semantic version of the expert |
|     status | `available` \| `deprecated` \| `disabled` | Yes |  |
|     instruction | string | Yes | System prompt that defines the expert's behavior |
|     skills | object | Yes | MCP skills available to this expert |
|     delegates | RegExp[] | Yes | Other published experts this expert can delegate tasks to |
|     tags | RegExp[] | Yes | Version tags (e.g., latest, stable) |

#### 404

Expert not found with the specified key.

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

## POST `/api/registry/v1/experts/{expertKey}`

**Update an expert**

Update metadata of an existing expert version (status, tags). Status transitions are restricted (e.g., deprecated cannot become available). Requires authentication and ownership.

**Operation ID:** `postApiRegistryV1ExpertsByExpertKey`

### Parameters

#### `expertKey` (path)

**Required**

**Description:** Unique identifier for an expert version (name@version or name@tag)
**Type:** string (pattern)
**Pattern:** `^((?:@[a-z0-9][a-z0-9_.-]*\/)?[a-z0-9][a-z0-9_.-]*)(?:@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?)|@([a-z0-9][a-z0-9_.-]*))?$`
**Length:** min: 1, max: 511
**Examples:** `my-expert@1.0.0`, `@perstack/base@latest`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| status | `available` \| `deprecated` \| `disabled` | No |  |
| tags | RegExp[] | No | Version tags (e.g., latest, stable) |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   expert | union | Yes |  |

#### 400

Bad Request. Possible reasons:
- Expert is not owned by the organization
- Status is the same as the current status
- Cannot change status of disabled expert
- Cannot change deprecated expert to available
- Cannot manually set latest tag
- Cannot remove latest tag from latest version

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

Expert not found with the specified key.

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

## DELETE `/api/registry/v1/experts/{expertKey}`

**Delete an expert version**

Delete a specific version of an expert from the Registry. Cannot delete if the expert is delegated to other experts. Requires authentication and ownership.

**Operation ID:** `deleteApiRegistryV1ExpertsByExpertKey`

### Parameters

#### `expertKey` (path)

**Required**

**Description:** Unique identifier for an expert version (name@version or name@tag)
**Type:** string (pattern)
**Pattern:** `^((?:@[a-z0-9][a-z0-9_.-]*\/)?[a-z0-9][a-z0-9_.-]*)(?:@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?)|@([a-z0-9][a-z0-9_.-]*))?$`
**Length:** min: 1, max: 511
**Examples:** `my-expert@1.0.0`, `@perstack/base@latest`

### Responses

#### 200

Response for status 200

**Content-Type:** `type`

#### 400

Bad Request. Possible reasons:
- Expert is not owned by the organization
- Expert is delegated to other experts

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

Expert not found with the specified key.

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

## GET `/api/registry/v1/experts/`

**List experts**

List all experts from the Registry. Returns only latest versions. Supports filtering by name prefix, sorting, and pagination.

**Operation ID:** `getApiRegistryV1Experts`

### Parameters

#### `organizationId` (query)

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
**Values:** `name`, `version`, `createdAt`, `updatedAt`

#### `order` (query)

**Type:** enum
**Values:** `asc`, `desc`

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
|   experts | object[] | Yes |  |
| meta | object | Yes |  |
|   total | number | Yes |  |
|   take | number | Yes |  |
|   skip | number | Yes |  |

#### 422

Query parameter schema validation failed.

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | `422` | Yes |  |
| error | `"Validation Failed"` | Yes |  |
| reason | unknown | Yes |  |

---

## POST `/api/registry/v1/experts/`

**Publish an expert**

Publish a new version of an expert to the Registry. If the expert name does not exist, it creates a new expert. Requires authentication.

**Operation ID:** `postApiRegistryV1Experts`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
| version | string (pattern: `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*...`) | Yes | Semantic version of the expert |
| minRuntimeVersion | `"v1.0"` | Yes |  |
| description | string | Yes | Brief description of what the expert does |
| instruction | string | Yes | System prompt that defines the expert's behavior |
| skills | object | Yes | MCP skills available to this expert |
| delegates | RegExp[] | No | Other published experts this expert can delegate tasks to |
| tags | RegExp[] | No | Version tags (e.g., latest, stable) |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   expert | union | Yes |  |

#### 400

Bad Request. Possible reasons:
- Expert {name} already exists (owned by another organization)
- Version {version} is already published
- @perstack/base is required
- Expert name cannot be scoped (for personal accounts)
- Expert name must be scoped (for team accounts)
- Delegate expert not found: {delegate}

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
