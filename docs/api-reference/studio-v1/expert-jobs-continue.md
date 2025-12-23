---
title: "Expert Jobs Continue API"
---

# Expert Jobs Continue

**Product:** studio
**Version:** v1

## Endpoints

- [POST `/api/studio/v1/expert_jobs/{expertJobId}/continue`](#post-api-studio-v1-expert-jobs-expertjobid-continue)

## POST `/api/studio/v1/expert_jobs/{expertJobId}/continue`

**Continue an expert job**

Continue a paused expert job from its last checkpoint. Used for interactive tool responses, additional queries, or resuming after max steps exceeded.

**Operation ID:** `postApiStudioV1Expert_jobsByExpertJobIdContinue`

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
| query | string | No |  |
| interactiveToolCallResult | boolean | No |  |
| files | union | No |  |
| temperature | string | No |  |
| maxSteps | string | No |  |
| maxRetries | string | No |  |
| model | `claude-opus-4-5` \| `claude-opus-4-1` \| `claude-opus-4-20250514` \| `claude-sonnet-4-5` \| `claude-sonnet-4-20250514` \| `claude-3-7-sonnet-20250219` \| `claude-haiku-4-5` \| `claude-3-5-haiku-latest` \| `gemini-3-pro-preview` \| `gemini-2.5-pro` \| `gemini-2.5-flash` \| `gemini-2.5-flash-lite` \| `gpt-5` \| `gpt-5-mini` \| `gpt-5-nano` \| `gpt-5-chat-latest` \| `o4-mini` \| `o3` \| `o3-mini` \| `gpt-4.1` \| `deepseek-chat` \| `deepseek-reasoner` | No |  |

### Responses

#### 200

Response for status 200

**Content-Type:** `application/json`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes |  |
|   expertJob | object | Yes |  |
|     type | `"expertJob"` | Yes |  |
|     id | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     organizationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |
|     createdAt | string | Yes |  |
|     updatedAt | string | Yes |  |
|     status | `queued` \| `processing` \| `completed` \| `requestInteractiveToolResult` \| `requestDelegateResult` \| `exceededMaxSteps` \| `failed` \| `canceling` \| `canceled` \| `expired` | Yes |  |
|     runtimeVersion | `"v1.0"` | Yes |  |
|     expertKey | string (pattern: `^((?:@[a-z0-9][a-z0-9_.-]*\/)?...`) | Yes | Unique identifier for an expert version (name@version or name@tag) |
|     query | string | No |  |
|     files | string[] | Yes |  |
|     interactiveToolCallResult | boolean | No |  |
|     expert | union | Yes |  |
|     model | `claude-opus-4-5` \| `claude-opus-4-1` \| `claude-opus-4-20250514` \| `claude-sonnet-4-5` \| `claude-sonnet-4-20250514` \| `claude-3-7-sonnet-20250219` \| `claude-haiku-4-5` \| `claude-3-5-haiku-latest` \| `gemini-3-pro-preview` \| `gemini-2.5-pro` \| `gemini-2.5-flash` \| `gemini-2.5-flash-lite` \| `gpt-5` \| `gpt-5-mini` \| `gpt-5-nano` \| `gpt-5-chat-latest` \| `o4-mini` \| `o3` \| `o3-mini` \| `gpt-4.1` \| `deepseek-chat` \| `deepseek-reasoner` | Yes |  |
|     temperature | number | Yes |  |
|     maxSteps | number | Yes |  |
|     maxRetries | number | Yes |  |
|     currentStep | number | Yes |  |
|     totalSteps | number | Yes |  |
|     totalDuration | number | Yes |  |
|     usage | object | Yes |  |
|       inputTokens | number | Yes |  |
|       outputTokens | number | Yes |  |
|       reasoningTokens | number | Yes |  |
|       totalTokens | number | Yes |  |
|       cachedInputTokens | number | Yes |  |
|     applicationId | string (pattern: `^[a-z0-9]+$`) | Yes | A unique identifier for a resource |

#### 400

Bad Request. Possible reasons:
- Query or files are required
- No checkpoint found
- Current status is unable to continue
- Provider API key not found

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

Expert job or workspace instance not found.

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
