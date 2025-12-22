# Storage Backends

Perstack supports multiple storage backends for persisting execution state. Choose the backend that best fits your deployment environment.

## Available Backends

| Backend       | Package                        | Use Case                                                                   |
| ------------- | ------------------------------ | -------------------------------------------------------------------------- |
| FileSystem    | `@perstack/filesystem-storage` | Local development, single-server deployments                               |
| AWS S3        | `@perstack/s3-storage`         | AWS environments, serverless, distributed systems                          |
| Cloudflare R2 | `@perstack/r2-storage`         | Edge deployments, Cloudflare Workers, cost-effective S3-compatible storage |

## Storage Interface

All backends implement the `Storage` interface from `@perstack/core`:

```typescript
interface Storage {
  // Checkpoint operations
  storeCheckpoint(checkpoint: Checkpoint): Promise<void>
  retrieveCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint>
  getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]>

  // Event operations
  storeEvent(event: RunEvent): Promise<void>
  getEventsByRun(jobId: string, runId: string): Promise<EventMeta[]>
  getEventContents(jobId: string, runId: string, maxStep?: number): Promise<RunEvent[]>

  // Job operations
  storeJob(job: Job): Promise<void>
  retrieveJob(jobId: string): Promise<Job | undefined>
  getAllJobs(): Promise<Job[]>

  // Run operations
  storeRunSetting(setting: RunSetting): Promise<void>
  getAllRuns(): Promise<RunSetting[]>
}
```

## FileSystem Storage (Default)

The default storage backend for local development.

```typescript
import { FileSystemStorage } from "@perstack/filesystem-storage"

const storage = new FileSystemStorage({
  basePath: "/path/to/perstack"  // optional, defaults to cwd/perstack
})
```

### Directory Structure

```
{basePath}/jobs/
├── {jobId}/
│   ├── job.json
│   ├── checkpoints/
│   │   └── {checkpointId}.json
│   └── runs/
│       └── {runId}/
│           ├── run-setting.json
│           └── event-{timestamp}-{step}-{type}.json
```

## AWS S3 Storage

For AWS environments and serverless deployments.

```typescript
import { S3Storage } from "@perstack/s3-storage"

const storage = new S3Storage({
  bucket: "my-perstack-bucket",
  region: "us-east-1",
  prefix: "perstack/",  // optional
  // Uses AWS default credential chain
})
```

### Configuration

| Option           | Type    | Required | Description                                          |
| ---------------- | ------- | -------- | ---------------------------------------------------- |
| `bucket`         | string  | Yes      | S3 bucket name                                       |
| `region`         | string  | Yes      | AWS region                                           |
| `prefix`         | string  | No       | Object key prefix (default: "")                      |
| `credentials`    | object  | No       | AWS credentials (uses default chain if not provided) |
| `endpoint`       | string  | No       | Custom endpoint (for MinIO, LocalStack)              |
| `forcePathStyle` | boolean | No       | Use path-style URLs (for MinIO)                      |

### AWS Credentials

S3Storage uses the [AWS default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html):

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (when running on AWS)

### IAM Policy

Minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-perstack-bucket",
        "arn:aws:s3:::my-perstack-bucket/*"
      ]
    }
  ]
}
```

## Cloudflare R2 Storage

For edge deployments and Cloudflare Workers.

```typescript
import { R2Storage } from "@perstack/r2-storage"

const storage = new R2Storage({
  accountId: "your-cloudflare-account-id",
  bucket: "my-perstack-bucket",
  accessKeyId: "your-r2-access-key-id",
  secretAccessKey: "your-r2-secret-access-key",
  prefix: "perstack/",  // optional
})
```

### Configuration

| Option            | Type   | Required | Description                     |
| ----------------- | ------ | -------- | ------------------------------- |
| `accountId`       | string | Yes      | Cloudflare account ID           |
| `bucket`          | string | Yes      | R2 bucket name                  |
| `accessKeyId`     | string | Yes      | R2 API access key ID            |
| `secretAccessKey` | string | Yes      | R2 API secret access key        |
| `prefix`          | string | No       | Object key prefix (default: "") |

### Getting R2 Credentials

1. Go to Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Create an API token with "Object Read & Write" permissions
3. Copy the Access Key ID and Secret Access Key

## Object Key Structure

All S3-compatible backends use the same key structure:

```
{prefix}/jobs/{jobId}/job.json
{prefix}/jobs/{jobId}/checkpoints/{checkpointId}.json
{prefix}/jobs/{jobId}/runs/{runId}/run-setting.json
{prefix}/jobs/{jobId}/runs/{runId}/event-{timestamp}-{step}-{type}.json
```

## Using Custom Storage with Runtime

When using the runtime programmatically, you can pass custom storage functions:

```typescript
import { dispatchToRuntime } from "@perstack/runner"
import { S3Storage } from "@perstack/s3-storage"

const storage = new S3Storage({
  bucket: "my-bucket",
  region: "us-east-1",
})

await dispatchToRuntime({
  setting: runSettings,
  runtime: "docker",
  storeCheckpoint: (checkpoint) => storage.storeCheckpoint(checkpoint),
  retrieveCheckpoint: (jobId, checkpointId) => storage.retrieveCheckpoint(jobId, checkpointId),
})
```

## Choosing a Backend

| Scenario                        | Recommended Backend |
| ------------------------------- | ------------------- |
| Local development               | FileSystem          |
| Single server production        | FileSystem          |
| AWS Lambda / ECS / EKS          | S3                  |
| Multi-region deployments        | S3 with replication |
| Cloudflare Workers              | R2                  |
| Edge-first architecture         | R2                  |
| Cost-sensitive with high egress | R2 (no egress fees) |
