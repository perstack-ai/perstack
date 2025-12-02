# @perstack/api-client

The official TypeScript/JavaScript API client for Perstack.

For API reference, see [Registry API](https://docs.perstack.ai/references/registry-api).

## Installation

```bash
npm install @perstack/api-client
# or
pnpm add @perstack/api-client
# or
yarn add @perstack/api-client
```

## Usage

### Initialization

```typescript
import { ApiV1Client } from "@perstack/api-client";

const client = new ApiV1Client({
  baseUrl: "https://api.perstack.ai", // Optional, defaults to https://api.perstack.ai
  apiKey: "YOUR_API_KEY", // Required for authenticated requests
});
```

### Registry

Interact with the Expert Registry.

```typescript
// Get all experts in the registry
const experts = await client.registry.experts.getMany({});

// Get a specific expert
const expert = await client.registry.experts.get({
  owner: "perstack",
  slug: "software-engineer",
});

// Get expert versions
const versions = await client.registry.experts.getVersions({
  owner: "perstack",
  slug: "software-engineer",
});
```

### Studio

Interact with the Studio (Experts, Jobs, Workspace).

#### Experts

```typescript
// Create a studio expert
const newExpert = await client.studio.experts.create({
  slug: "my-custom-expert",
  description: "A custom expert for my needs",
});

// Get studio experts
const myExperts = await client.studio.experts.getMany({});
```

#### Expert Jobs

Manage expert execution jobs.

```typescript
// Start a job
const job = await client.studio.expertJobs.start({
  expertId: "expert-id",
  input: {
    // ... input data
  },
});

// Get job status
const jobStatus = await client.studio.expertJobs.get({
  id: job.id,
});

// Continue a job (if waiting for input)
await client.studio.expertJobs.continue({
  id: job.id,
  input: {
    // ... user input
  },
});
```

#### Workspace

Manage workspace resources (Items, Variables, Secrets).

```typescript
// Get workspace details
const workspace = await client.studio.workspace.get();

// Create a workspace item (file)
await client.studio.workspace.items.create({
  path: "/path/to/file.txt",
  content: "Hello, World!",
});

// Create a secret
await client.studio.workspace.secrets.create({
  key: "OPENAI_API_KEY",
  value: "sk-...",
});
```

## Error Handling

The client throws errors for failed requests.

```typescript
try {
  await client.registry.experts.get({ owner: "invalid", slug: "expert" });
} catch (error) {
  console.error("Failed to fetch expert:", error);
}
```
