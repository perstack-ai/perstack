# @perstack/s3-storage

AWS S3 storage backend for Perstack.

## Installation

```bash
npm install @perstack/s3-storage
```

## Usage

```typescript
import { S3Storage } from "@perstack/s3-storage"

const storage = new S3Storage({
  bucket: "my-perstack-bucket",
  region: "us-east-1",
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

| Option        | Type   | Required | Description                                                     |
| ------------- | ------ | -------- | --------------------------------------------------------------- |
| `bucket`      | string | Yes      | S3 bucket name                                                  |
| `region`      | string | Yes      | AWS region (e.g., "us-east-1")                                  |
| `prefix`      | string | No       | Object key prefix (default: "")                                 |
| `credentials` | object | No       | AWS credentials (uses default credential chain if not provided) |

## AWS Credentials

The S3Storage uses the [AWS default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html):

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (when running on AWS)

## Object Key Structure

```
{prefix}/jobs/{jobId}/job.json
{prefix}/jobs/{jobId}/checkpoints/{checkpointId}.json
{prefix}/jobs/{jobId}/runs/{runId}/run-setting.json
{prefix}/jobs/{jobId}/runs/{runId}/event-{timestamp}-{step}-{type}.json
```
