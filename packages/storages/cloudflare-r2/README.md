# @perstack/r2-storage

Cloudflare R2 storage backend for Perstack.

## Installation

```bash
npm install @perstack/r2-storage
```

## Usage

```typescript
import { R2Storage } from "@perstack/r2-storage"

const storage = new R2Storage({
  accountId: "your-cloudflare-account-id",
  bucket: "my-perstack-bucket",
  accessKeyId: "your-r2-access-key-id",
  secretAccessKey: "your-r2-secret-access-key",
  prefix: "perstack/",  // optional, defaults to ""
})

// Store a checkpoint
await storage.storeCheckpoint(checkpoint)

// Retrieve a checkpoint
const checkpoint = await storage.retrieveCheckpoint(jobId, checkpointId)

// Get all checkpoints for a job
const checkpoints = await storage.getCheckpointsByJobId(jobId)
```

## Configuration

| Option            | Type   | Required | Description                     |
| ----------------- | ------ | -------- | ------------------------------- |
| `accountId`       | string | Yes      | Cloudflare account ID           |
| `bucket`          | string | Yes      | R2 bucket name                  |
| `accessKeyId`     | string | Yes      | R2 API access key ID            |
| `secretAccessKey` | string | Yes      | R2 API secret access key        |
| `prefix`          | string | No       | Object key prefix (default: "") |

## Getting R2 Credentials

1. Go to Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Create an API token with "Object Read & Write" permissions
3. Copy the Access Key ID and Secret Access Key

## Object Key Structure

```
{prefix}/jobs/{jobId}/job.json
{prefix}/jobs/{jobId}/checkpoints/{checkpointId}.json
{prefix}/jobs/{jobId}/runs/{runId}/run-setting.json
{prefix}/jobs/{jobId}/runs/{runId}/event-{timestamp}-{step}-{type}.json
```
