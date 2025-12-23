import { describe, expect, it } from "vitest"
import {
  applicationSchema,
  checkpointSchema,
  createCheckpointResponseSchema,
  createStudioExpertResponseSchema,
  createWorkspaceItemResponseSchema,
  createWorkspaceSecretResponseSchema,
  createWorkspaceVariableResponseSchema,
  deleteStudioExpertResponseSchema,
  deleteWorkspaceItemResponseSchema,
  deleteWorkspaceSecretResponseSchema,
  deleteWorkspaceVariableResponseSchema,
  expertDigestSchema,
  expertJobSchema,
  expertJobStatusSchema,
  findWorkspaceItemsResponseSchema,
  getCheckpointResponseSchema,
  getExpertJobResponseSchema,
  getStudioExpertResponseSchema,
  getWorkspaceInstanceResponseSchema,
  getWorkspaceItemResponseSchema,
  getWorkspaceResponseSchema,
  listCheckpointsResponseSchema,
  listExpertJobsResponseSchema,
  listStudioExpertsResponseSchema,
  listWorkspaceItemsResponseSchema,
  ownerSchema,
  startExpertJobResponseSchema,
  studioExpertSchema,
  updateExpertJobResponseSchema,
  updateStudioExpertResponseSchema,
  updateWorkspaceItemResponseSchema,
  updateWorkspaceVariableResponseSchema,
  workspaceInstanceSchema,
  workspaceItemSchema,
  workspaceSchema,
  workspaceSecretSchema,
  workspaceVariableSchema,
} from "./types.js"

describe("applicationSchema", () => {
  it("parses valid application", () => {
    const app = applicationSchema.parse({ id: "app-123", name: "test-app" })
    expect(app.id).toBe("app-123")
    expect(app.name).toBe("test-app")
  })
})

describe("ownerSchema", () => {
  it("transforms createdAt to Date", () => {
    const owner = ownerSchema.parse({
      organizationId: "org123",
      createdAt: "2024-06-15T12:30:45Z",
    })
    expect(owner.createdAt).toBeInstanceOf(Date)
  })
})

describe("studioExpertSchema", () => {
  const validExpert = {
    type: "studioExpert",
    id: "test-id",
    key: "my-expert",
    name: "my-expert",
    minRuntimeVersion: "v1.0",
    description: "Test",
    owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    instruction: "Test",
    skills: {},
    delegates: [],
    application: { id: "app-123", name: "test-app" },
  }

  it("parses valid studio expert", () => {
    const expert = studioExpertSchema.parse(validExpert)
    expect(expert.type).toBe("studioExpert")
    expect(expert.createdAt).toBeInstanceOf(Date)
    expect(expert.updatedAt).toBeInstanceOf(Date)
  })

  it("parses expert with forkFrom", () => {
    const expert = studioExpertSchema.parse({ ...validExpert, forkFrom: "base@1.0.0" })
    expect(expert.forkFrom).toBe("base@1.0.0")
  })
})

describe("expertDigestSchema", () => {
  it("parses valid digest", () => {
    const digest = expertDigestSchema.parse({
      type: "expertDigest",
      id: "id-1",
      key: "my-expert",
      name: "my-expert",
      minRuntimeVersion: "v1.0",
      description: "Test",
      owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      tags: [],
    })
    expect(digest.type).toBe("expertDigest")
  })
})

describe("expertJobStatusSchema", () => {
  it("accepts valid status values", () => {
    expect(expertJobStatusSchema.parse("pending")).toBe("pending")
    expect(expertJobStatusSchema.parse("running")).toBe("running")
    expect(expertJobStatusSchema.parse("completed")).toBe("completed")
    expect(expertJobStatusSchema.parse("failed")).toBe("failed")
    expect(expertJobStatusSchema.parse("cancelled")).toBe("cancelled")
    expect(expertJobStatusSchema.parse("waiting")).toBe("waiting")
  })
})

describe("expertJobSchema", () => {
  it("parses valid job", () => {
    const job = expertJobSchema.parse({
      id: "job-123",
      expertKey: "my-expert",
      status: "pending",
      query: "Test query",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    })
    expect(job.id).toBe("job-123")
    expect(job.createdAt).toBeInstanceOf(Date)
  })

  it("parses job with optional dates", () => {
    const job = expertJobSchema.parse({
      id: "job-123",
      expertKey: "my-expert",
      status: "completed",
      query: "Test query",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      startedAt: "2024-01-01T00:01:00Z",
      completedAt: "2024-01-01T00:02:00Z",
    })
    expect(job.startedAt).toBeInstanceOf(Date)
    expect(job.completedAt).toBeInstanceOf(Date)
  })
})

describe("checkpointSchema", () => {
  it("parses valid checkpoint", () => {
    const checkpoint = checkpointSchema.parse({
      id: "cp-123",
      expertJobId: "job-123",
      sequence: 1,
      createdAt: "2024-01-01T00:00:00Z",
    })
    expect(checkpoint.id).toBe("cp-123")
    expect(checkpoint.createdAt).toBeInstanceOf(Date)
  })
})

describe("workspaceInstanceSchema", () => {
  it("parses valid workspace instance", () => {
    const instance = workspaceInstanceSchema.parse({
      id: "wi-123",
      expertJobId: "job-123",
      createdAt: "2024-01-01T00:00:00Z",
    })
    expect(instance.id).toBe("wi-123")
    expect(instance.createdAt).toBeInstanceOf(Date)
  })
})

describe("workspaceItemSchema", () => {
  it("parses valid file item", () => {
    const item = workspaceItemSchema.parse({
      id: "item-123",
      path: "/test/file.txt",
      type: "file",
      size: 1024,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    })
    expect(item.type).toBe("file")
    expect(item.size).toBe(1024)
  })

  it("parses valid directory item", () => {
    const item = workspaceItemSchema.parse({
      id: "item-123",
      path: "/test/dir",
      type: "directory",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    })
    expect(item.type).toBe("directory")
    expect(item.size).toBeUndefined()
  })
})

describe("workspaceSchema", () => {
  it("parses valid workspace", () => {
    const ws = workspaceSchema.parse({
      id: "ws-123",
      applicationId: "app-123",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    })
    expect(ws.id).toBe("ws-123")
    expect(ws.createdAt).toBeInstanceOf(Date)
  })
})

describe("workspaceVariableSchema", () => {
  it("parses valid variable", () => {
    const variable = workspaceVariableSchema.parse({ name: "MY_VAR", value: "my-value" })
    expect(variable.name).toBe("MY_VAR")
    expect(variable.value).toBe("my-value")
  })
})

describe("workspaceSecretSchema", () => {
  it("parses valid secret", () => {
    const secret = workspaceSecretSchema.parse({ name: "MY_SECRET" })
    expect(secret.name).toBe("MY_SECRET")
  })
})

describe("response schemas", () => {
  describe("getStudioExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = getStudioExpertResponseSchema.parse({
        data: {
          expert: {
            type: "studioExpert",
            id: "id-1",
            key: "my-expert",
            name: "my-expert",
            minRuntimeVersion: "v1.0",
            description: "Test",
            owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            instruction: "Test",
            skills: {},
            delegates: [],
            application: { id: "app-123", name: "test-app" },
          },
        },
      })
      expect(response.data.expert.name).toBe("my-expert")
    })
  })

  describe("listStudioExpertsResponseSchema", () => {
    it("parses valid response", () => {
      const response = listStudioExpertsResponseSchema.parse({
        data: { experts: [] },
        meta: { total: 0, take: 100, skip: 0 },
      })
      expect(response.data.experts).toEqual([])
    })
  })

  describe("createStudioExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = createStudioExpertResponseSchema.parse({
        data: {
          expert: {
            type: "studioExpert",
            id: "id-1",
            key: "my-expert",
            name: "my-expert",
            minRuntimeVersion: "v1.0",
            description: "Test",
            owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            instruction: "Test",
            skills: {},
            delegates: [],
            application: { id: "app-123", name: "test-app" },
          },
        },
      })
      expect(response.data.expert).toBeDefined()
    })
  })

  describe("updateStudioExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = updateStudioExpertResponseSchema.parse({
        data: {
          expert: {
            type: "studioExpert",
            id: "id-1",
            key: "my-expert",
            name: "my-expert",
            minRuntimeVersion: "v1.0",
            description: "Test",
            owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            instruction: "Test",
            skills: {},
            delegates: [],
            application: { id: "app-123", name: "test-app" },
          },
        },
      })
      expect(response.data.expert).toBeDefined()
    })
  })

  describe("deleteStudioExpertResponseSchema", () => {
    it("parses empty response", () => {
      const response = deleteStudioExpertResponseSchema.parse({})
      expect(response).toEqual({})
    })
  })

  describe("getExpertJobResponseSchema", () => {
    it("parses valid response", () => {
      const response = getExpertJobResponseSchema.parse({
        data: {
          expertJob: {
            id: "job-123",
            expertKey: "my-expert",
            status: "pending",
            query: "Test",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.expertJob.id).toBe("job-123")
    })
  })

  describe("listExpertJobsResponseSchema", () => {
    it("parses valid response", () => {
      const response = listExpertJobsResponseSchema.parse({
        data: { expertJobs: [] },
        meta: { total: 0, take: 100, skip: 0 },
      })
      expect(response.data.expertJobs).toEqual([])
    })
  })

  describe("startExpertJobResponseSchema", () => {
    it("parses valid response", () => {
      const response = startExpertJobResponseSchema.parse({
        data: {
          expertJob: {
            id: "job-123",
            expertKey: "my-expert",
            status: "pending",
            query: "Test",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.expertJob).toBeDefined()
    })
  })

  describe("updateExpertJobResponseSchema", () => {
    it("parses valid response", () => {
      const response = updateExpertJobResponseSchema.parse({
        data: {
          expertJob: {
            id: "job-123",
            expertKey: "my-expert",
            status: "cancelled",
            query: "Test",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.expertJob.status).toBe("cancelled")
    })
  })

  describe("checkpoint schemas", () => {
    it("getCheckpointResponseSchema parses valid response", () => {
      const response = getCheckpointResponseSchema.parse({
        data: {
          checkpoint: {
            id: "cp-1",
            expertJobId: "job-1",
            sequence: 1,
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.checkpoint.id).toBe("cp-1")
    })

    it("listCheckpointsResponseSchema parses valid response", () => {
      const response = listCheckpointsResponseSchema.parse({
        data: { checkpoints: [] },
        meta: { total: 0, take: 100, skip: 0 },
      })
      expect(response.data.checkpoints).toEqual([])
    })

    it("createCheckpointResponseSchema parses valid response", () => {
      const response = createCheckpointResponseSchema.parse({
        data: {
          checkpoint: {
            id: "cp-1",
            expertJobId: "job-1",
            sequence: 1,
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.checkpoint).toBeDefined()
    })
  })

  describe("workspace instance schemas", () => {
    it("getWorkspaceInstanceResponseSchema parses valid response", () => {
      const response = getWorkspaceInstanceResponseSchema.parse({
        data: {
          workspaceInstance: {
            id: "wi-1",
            expertJobId: "job-1",
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.workspaceInstance.id).toBe("wi-1")
    })
  })

  describe("workspace item schemas", () => {
    const mockItem = {
      id: "item-1",
      path: "/test.txt",
      type: "file",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    }

    it("getWorkspaceItemResponseSchema parses valid response", () => {
      const response = getWorkspaceItemResponseSchema.parse({ data: { item: mockItem } })
      expect(response.data.item.id).toBe("item-1")
    })

    it("listWorkspaceItemsResponseSchema parses valid response", () => {
      const response = listWorkspaceItemsResponseSchema.parse({
        data: { items: [mockItem] },
        meta: { total: 1, take: 100, skip: 0 },
      })
      expect(response.data.items).toHaveLength(1)
    })

    it("createWorkspaceItemResponseSchema parses valid response", () => {
      const response = createWorkspaceItemResponseSchema.parse({ data: { item: mockItem } })
      expect(response.data.item).toBeDefined()
    })

    it("updateWorkspaceItemResponseSchema parses valid response", () => {
      const response = updateWorkspaceItemResponseSchema.parse({ data: { item: mockItem } })
      expect(response.data.item).toBeDefined()
    })

    it("deleteWorkspaceItemResponseSchema parses empty response", () => {
      const response = deleteWorkspaceItemResponseSchema.parse({})
      expect(response).toEqual({})
    })

    it("findWorkspaceItemsResponseSchema parses valid response", () => {
      const response = findWorkspaceItemsResponseSchema.parse({ data: { items: [mockItem] } })
      expect(response.data.items).toHaveLength(1)
    })
  })

  describe("workspace schemas", () => {
    it("getWorkspaceResponseSchema parses valid response", () => {
      const response = getWorkspaceResponseSchema.parse({
        data: {
          workspace: {
            id: "ws-1",
            applicationId: "app-1",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      })
      expect(response.data.workspace.id).toBe("ws-1")
    })
  })

  describe("variable schemas", () => {
    it("createWorkspaceVariableResponseSchema parses valid response", () => {
      const response = createWorkspaceVariableResponseSchema.parse({
        data: { variable: { name: "MY_VAR", value: "val" } },
      })
      expect(response.data.variable.name).toBe("MY_VAR")
    })

    it("updateWorkspaceVariableResponseSchema parses valid response", () => {
      const response = updateWorkspaceVariableResponseSchema.parse({
        data: { variable: { name: "MY_VAR", value: "new-val" } },
      })
      expect(response.data.variable.value).toBe("new-val")
    })

    it("deleteWorkspaceVariableResponseSchema parses empty response", () => {
      const response = deleteWorkspaceVariableResponseSchema.parse({})
      expect(response).toEqual({})
    })
  })

  describe("secret schemas", () => {
    it("createWorkspaceSecretResponseSchema parses valid response", () => {
      const response = createWorkspaceSecretResponseSchema.parse({
        data: { secret: { name: "MY_SECRET" } },
      })
      expect(response.data.secret.name).toBe("MY_SECRET")
    })

    it("deleteWorkspaceSecretResponseSchema parses empty response", () => {
      const response = deleteWorkspaceSecretResponseSchema.parse({})
      expect(response).toEqual({})
    })
  })
})
