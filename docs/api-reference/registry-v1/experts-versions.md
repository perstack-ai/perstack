---
title: "Experts Versions API"
---

# Experts Versions

**Product:** registry
**Version:** v1

## Endpoints

- [GET `/api/registry/v1/experts/{expertKey}/versions`](#get-api-registry-v1-experts-expertkey-versions)

## GET `/api/registry/v1/experts/{expertKey}/versions`

**List expert versions**

List all available versions of a specific expert from the Registry. Returns versions sorted by version number (descending) with the latest tag indicated.

**Operation ID:** `getApiRegistryV1ExpertsByExpertKeyVersions`

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
|   versions | object[] | Yes |  |
|   latest | string | Yes |  |
| meta | object | Yes |  |
|   total | union | Yes |  |

#### 404

Not Found. Possible reasons:
- Expert not found
- Latest version not found

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
