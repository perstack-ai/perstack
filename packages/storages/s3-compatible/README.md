# @perstack/s3-compatible-storage

Base implementation for S3-compatible storage backends in Perstack.

This package provides the core S3 storage logic shared by:
- `@perstack/s3-storage` (AWS S3)
- `@perstack/r2-storage` (Cloudflare R2)

## Installation

This is an internal package. Use `@perstack/s3-storage` or `@perstack/r2-storage` instead.

## Object Key Structure

```
{prefix}/jobs/{jobId}/job.json
{prefix}/jobs/{jobId}/checkpoints/{checkpointId}.json
{prefix}/jobs/{jobId}/runs/{runId}/run-setting.json
{prefix}/jobs/{jobId}/runs/{runId}/event-{timestamp}-{step}-{type}.json
```

## Configuration

The base class requires an S3Client and configuration:

```typescript
import { S3Client } from "@aws-sdk/client-s3"
import { S3StorageBase } from "@perstack/s3-compatible-storage"

const client = new S3Client({ region: "us-east-1" })
const storage = new S3StorageBase({
  client,
  bucket: "my-bucket",
  prefix: "perstack/",  // optional, defaults to ""
})
```
