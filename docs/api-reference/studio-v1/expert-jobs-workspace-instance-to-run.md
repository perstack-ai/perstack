---
title: "Expert Jobs Workspace Instance To Run API"
---

# Expert Jobs Workspace Instance To Run

**Product:** studio
**Version:** v1

## Endpoints

- [GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance_to_run/`](#get-api-studio-v1-expert-jobs-expertjobid-workspace-instance-to-run-)

## GET `/api/studio/v1/expert_jobs/{expertJobId}/workspace_instance_to_run/`

**Get workspace instance to run**

Retrieve workspace instance data needed to run an expert job. Internal API for system use only.

**Operation ID:** `getApiStudioV1Expert_jobsByExpertJobIdWorkspace_instance_to_run`

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
|   workspaceInstanceToRun | object | Yes |  |
|     type | `"workspaceInstanceToRun"` | Yes |  |
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
|     envVariables | object | Yes |  |
|     envSecrets | object | Yes |  |

#### 401

Authentication failed. Possible reasons:
- Authorization header is not provided
- Invalid system API key

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
