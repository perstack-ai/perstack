import type { stepSchema } from "@perstack/core"
import type z from "zod"
import type { checkpointSchema } from "../../core/src/schemas/checkpoint.js"
import type { apiCheckpointSchema } from "../v1/index.js"
import type { apiApplicationSchema } from "../v1/schemas/application.js"
import type {
  apiExpertDigestSchema,
  apiRegistryExpertSchema,
  apiStudioExpertSchema,
} from "../v1/schemas/expert.js"
import type { apiExpertJobSchema } from "../v1/schemas/expert-job.js"
import type { apiOrganizationSchema } from "../v1/schemas/organization.js"
import type { apiWorkspaceSchema } from "../v1/schemas/workspace.js"
import type {
  apiWorkspaceItemDirectorySchema,
  apiWorkspaceItemFileSchema,
} from "../v1/schemas/workspace-item.js"

const now = new Date()
const nowISO = now.toISOString()

export const organization: z.input<typeof apiOrganizationSchema> = {
  type: "organization",
  id: "organization123456789012",
  createdAt: nowISO,
  updatedAt: nowISO,
  status: "active",
  name: "test",
  organizationType: "personal",
  maxApplications: 10,
  maxApiKeys: 10,
  maxStudioExperts: 10,
}

export const assertOrganization = {
  ...organization,
  createdAt: now,
  updatedAt: now,
}

export const application: z.input<typeof apiApplicationSchema> = {
  type: "application",
  id: "application1234567890123",
  name: "test",
  organizationId: organization.id,
  organization,
  createdAt: nowISO,
  updatedAt: nowISO,
  status: "active",
}

export const assertApplication = {
  ...application,
  organization: assertOrganization,
  createdAt: now,
  updatedAt: now,
}

export const registryExpert: z.input<typeof apiRegistryExpertSchema> = {
  type: "registryExpert",
  id: "registryexpert1234567890",
  key: "@test/test@1.0.0",
  name: "@test/test",
  version: "1.0.0",
  minRuntimeVersion: "v1.0",
  description: "test",
  instruction: "test",
  skills: {},
  delegates: [],
  tags: [],
  owner: {
    organizationId: organization.id,
    createdAt: nowISO,
    name: "test",
  },
  createdAt: nowISO,
  updatedAt: nowISO,
  status: "available",
}

export const assertRegistryExpert = {
  ...registryExpert,
  owner: {
    ...registryExpert.owner,
    createdAt: now,
  },
  createdAt: now,
  updatedAt: now,
}

export const studioExpert: z.input<typeof apiStudioExpertSchema> = {
  type: "studioExpert",
  id: "studioexpert123456789012",
  key: "@test/studio-test",
  name: "@test/studio-test",
  version: "1.0.0",
  minRuntimeVersion: "v1.0",
  description: "test",
  instruction: "test",
  skills: {},
  delegates: [],
  forkFrom: "@test/test@1.0.0",
  application,
  owner: {
    organizationId: organization.id,
    createdAt: nowISO,
    name: "test",
  },
  createdAt: nowISO,
  updatedAt: nowISO,
}

export const assertStudioExpert = {
  ...studioExpert,
  owner: {
    ...studioExpert.owner,
    createdAt: now,
  },
  application: assertApplication,
  createdAt: now,
  updatedAt: now,
}

export const expertDigest: z.input<typeof apiExpertDigestSchema> = {
  type: "expertDigest",
  id: "expertdigest123456789012",
  key: "@test/expert-digest@1.0.0",
  name: "@test/expert-digest",
  version: "1.0.0",
  minRuntimeVersion: "v1.0",
  description: "test",
  tags: [],
  owner: {
    organizationId: organization.id,
    createdAt: nowISO,
    name: "test",
  },
  createdAt: nowISO,
  updatedAt: nowISO,
}

export const assertExpertDigest = {
  ...expertDigest,
  owner: {
    ...expertDigest.owner,
    createdAt: now,
  },
  createdAt: now,
  updatedAt: now,
}

export const expertJob: z.input<typeof apiExpertJobSchema> = {
  type: "expertJob",
  id: "expertjob123456789012345",
  status: "queued",
  runtimeVersion: "v1.0",
  expertKey: "@test/test",
  query: "test",
  files: [],
  expert: registryExpert,
  model: "test",
  temperature: 0.5,
  maxSteps: 10,
  maxRetries: 3,
  currentStep: 0,
  totalSteps: 10,
  totalDuration: 1000,
  usage: {
    inputTokens: 100,
    outputTokens: 100,
    reasoningTokens: 100,
    cachedInputTokens: 100,
    totalTokens: 200,
  },
  createdAt: nowISO,
  updatedAt: nowISO,
  applicationId: application.id,
}

export const assertExpertJob = {
  ...expertJob,
  expert: assertRegistryExpert,
  createdAt: now,
  updatedAt: now,
}

export const runtimeCheckpoint: z.input<typeof checkpointSchema> = {
  id: "checkpoint123456789012345",
  runId: "run123456789012345",
  status: "completed",
  stepNumber: 3,
  messages: [],
  expert: {
    key: "@perstack/deep-research",
    name: "@perstack/deep-research",
    version: "1.0.0",
  },
  usage: {
    inputTokens: 100,
    outputTokens: 100,
    reasoningTokens: 100,
    cachedInputTokens: 100,
    totalTokens: 200,
  },
}

export const runtimeStep: z.input<typeof stepSchema> = {
  stepNumber: 1,
  inputMessages: [],
  newMessages: [],
  toolCall: undefined,
  toolResult: undefined,
  usage: {
    inputTokens: 100,
    outputTokens: 100,
    reasoningTokens: 100,
    cachedInputTokens: 100,
    totalTokens: 200,
  },
  startedAt: now.getTime(),
}

export const checkpoint: z.input<typeof apiCheckpointSchema> = {
  type: "checkpoint",
  id: "checkpoint123456789012345",
  action: {
    type: "todo",
    newTodos: [],
    completedTodos: [],
    todos: [],
  },
  expertJobId: expertJob.id,
  runId: "testrun123456789012345",
  stepNumber: 1,
  status: "completed",
  expert: expertDigest,
  skillName: "test",
  toolName: "test",
  delegateTo: undefined,
  delegatedBy: undefined,
  inputMessages: [],
  messages: [],
  newMessages: [],
  toolCall: undefined,
  toolResult: undefined,
  usage: {
    inputTokens: 100,
    outputTokens: 100,
    reasoningTokens: 100,
    cachedInputTokens: 100,
    totalTokens: 200,
  },
  contextWindow: 100,
  contextWindowUsage: 100,
  startedAt: nowISO,
  finishedAt: nowISO,
}

export const assertCheckpoint = {
  ...checkpoint,
  expert: assertExpertDigest,
  startedAt: now,
  finishedAt: now,
}

export const workspace: z.input<typeof apiWorkspaceSchema> = {
  type: "workspace",
  id: "workspace123456789012345",
  applicationId: application.id,
  application,
  createdAt: nowISO,
  updatedAt: nowISO,
  items: [],
  countItems: 0,
  envVariables: [],
  envSecrets: [],
  countWorkspaceInstances: 0,
}

export const assertWorkspace = {
  ...workspace,
  application: assertApplication,
  createdAt: now,
  updatedAt: now,
}

export const workspaceItemDirectory: z.input<typeof apiWorkspaceItemDirectorySchema> = {
  type: "workspaceItemDirectory",
  id: "workspaceitemdirectory12",
  owner: "user",
  lifecycle: "application",
  permission: "readOnly",
  path: "test",
  createdAt: nowISO,
  updatedAt: nowISO,
}

export const assertWorkspaceItemDirectory = {
  ...workspaceItemDirectory,
  createdAt: now,
  updatedAt: now,
}

export const workspaceItemFile: z.input<typeof apiWorkspaceItemFileSchema> = {
  type: "workspaceItemFile",
  id: "workspaceitemfile1234567",
  owner: "user",
  lifecycle: "application",
  permission: "readOnly",
  path: "test.txt",
  key: "test",
  mimeType: "text/plain",
  size: 100,
  createdAt: nowISO,
  updatedAt: nowISO,
}

export const assertWorkspaceItemFile = {
  ...workspaceItemFile,
  createdAt: now,
  updatedAt: now,
}
