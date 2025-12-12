# @perstack/storage

Perstack Storage - Job, Checkpoint, Event, and Run persistence.

## Installation

```bash
pnpm add @perstack/storage
```

## Usage

```typescript
import {
  createInitialJob,
  storeJob,
  retrieveJob,
  getAllJobs,
  getJobDir,
  getJobsDir,
  defaultStoreCheckpoint,
  defaultRetrieveCheckpoint,
  getCheckpointsByJobId,
  getCheckpointDir,
  getCheckpointPath,
  defaultStoreEvent,
  getEventsByRun,
  getEventContents,
  storeRunSetting,
  getAllRuns,
  defaultGetRunDir,
} from "@perstack/storage"

// Create and store a job
const job = createInitialJob("job-123", "my-expert", 50)
storeJob(job)

// Retrieve a job
const retrieved = retrieveJob("job-123")

// Get all jobs
const jobs = getAllJobs()
```

## API

### Job Management

| Function | Description |
| --- | --- |
| `createInitialJob(jobId, expertKey, maxSteps?)` | Create initial job object |
| `storeJob(job)` | Store job to filesystem |
| `retrieveJob(jobId)` | Retrieve job by ID |
| `getAllJobs()` | Get all jobs sorted by start time |
| `getJobDir(jobId)` | Get job directory path |
| `getJobsDir()` | Get jobs root directory path |

### Checkpoint Management

| Function | Description |
| --- | --- |
| `defaultStoreCheckpoint(checkpoint)` | Store checkpoint to filesystem |
| `defaultRetrieveCheckpoint(jobId, checkpointId)` | Retrieve checkpoint |
| `getCheckpointsByJobId(jobId)` | Get all checkpoints for a job |
| `getCheckpointDir(jobId)` | Get checkpoint directory path |
| `getCheckpointPath(jobId, checkpointId)` | Get checkpoint file path |

### Event Management

| Function | Description |
| --- | --- |
| `defaultStoreEvent(event)` | Store event to filesystem |
| `getEventsByRun(jobId, runId)` | Get event metadata for a run |
| `getEventContents(jobId, runId, maxStepNumber?)` | Get full event contents |

### Run Setting Management

| Function | Description |
| --- | --- |
| `storeRunSetting(setting, fs?, getRunDir?)` | Store run setting |
| `getAllRuns()` | Get all run settings sorted by update time |
| `defaultGetRunDir(jobId, runId)` | Get run directory path |
| `createDefaultFileSystem()` | Create default filesystem adapter |

## Storage Structure

```
perstack/
└── jobs/
    └── {jobId}/
        ├── job.json
        ├── checkpoints/
        │   └── {checkpointId}.json
        └── runs/
            └── {runId}/
                ├── run-setting.json
                └── event-{timestamp}-{step}-{type}.json
```
