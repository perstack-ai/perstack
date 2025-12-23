---
title: "Experts API"
---

# Experts

**Product:** studio
**Version:** v1

## Endpoints

- [GET `/api/studio/v1/experts/`](#get-api-studio-v1-experts-)
- [POST `/api/studio/v1/experts/`](#post-api-studio-v1-experts-)
- [GET `/api/studio/v1/experts/{expertKey}`](#get-api-studio-v1-experts-expertkey-)
- [POST `/api/studio/v1/experts/{expertKey}`](#post-api-studio-v1-experts-expertkey-)
- [DELETE `/api/studio/v1/experts/{expertKey}`](#delete-api-studio-v1-experts-expertkey-)

## GET `/api/studio/v1/experts/`

**List studio experts**

List all studio experts in the application. Supports filtering by name prefix, sorting, and pagination.

**Operation ID:** `getApiStudioV1Experts`

### Parameters

#### `applicationId` (query)

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
**Values:** `name`, `version`, `createdAt`, `updatedAt`

#### `order` (query)

**Type:** enum
**Values:** `asc`, `desc`

#### `take` (query)

**Required**

**Range:** min: 1, max: 100
**Default:** `100`

#### `skip` (query)

**Required**

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

## POST `/api/studio/v1/experts/`

**Create a studio expert**

Create a new studio expert in the application. Studio experts are development versions that can be tested before publishing to the Registry.

**Operation ID:** `postApiStudioV1Experts`

### Request Body

**Required**

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string (pattern: `^(@[a-z0-9][a-z0-9_-]*\/)?[a-z...`) | Yes | Expert name. Scoped names (@org/name) are required for team organizations |
| minRuntimeVersion | `"v1.0"` | Yes |  |
| description | string | Yes | Brief description of what the expert does |
| instruction | string | Yes | System prompt that defines the expert's behavior |
| skills | object | Yes | MCP skills available to this expert |
| delegates | RegExp[] | Yes | Other published experts this expert can delegate tasks to |
| forkFrom | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | No | Key of the registry expert this was forked from |

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
- Expert with this name already exists
- Delegate expert not found
- forkFrom expert not found

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

## GET `/api/studio/v1/experts/{expertKey}`

**Get a studio expert**

Retrieve detailed information about a specific studio expert.

**Operation ID:** `getApiStudioV1ExpertsByExpertKey`

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
|   expert | union | Yes |  |

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

Studio expert not found with the specified key.

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

## POST `/api/studio/v1/experts/{expertKey}`

**Update a studio expert**

Update an existing studio expert. All fields are optional; only provided fields will be updated.

**Operation ID:** `postApiStudioV1ExpertsByExpertKey`

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
| minRuntimeVersion | `"v1.0"` | No |  |
| description | string | No | Brief description of what the expert does |
| instruction | string | No | System prompt that defines the expert's behavior |
| skills | object | No | MCP skills available to this expert |
| delegates | RegExp[] | No | Other published experts this expert can delegate tasks to |
| forkFrom | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | No | Key of the registry expert this was forked from |

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
- Delegate expert not found
- forkFrom expert not found

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

Studio expert not found with the specified key.

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

## DELETE `/api/studio/v1/experts/{expertKey}`

**Delete a studio expert**

Delete a studio expert from the application.

**Operation ID:** `deleteApiStudioV1ExpertsByExpertKey`

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

Studio expert not found with the specified key.

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
