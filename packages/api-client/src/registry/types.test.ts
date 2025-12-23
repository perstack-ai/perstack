import { describe, expect, it } from "vitest"
import {
  createExpertResponseSchema,
  deleteExpertResponseSchema,
  expertDigestSchema,
  getExpertResponseSchema,
  getExpertVersionsResponseSchema,
  listExpertsResponseSchema,
  ownerSchema,
  registryExpertSchema,
  registryExpertStatusSchema,
  updateExpertResponseSchema,
} from "./types.js"

describe("registryExpertStatusSchema", () => {
  it("accepts valid status values", () => {
    expect(registryExpertStatusSchema.parse("available")).toBe("available")
    expect(registryExpertStatusSchema.parse("deprecated")).toBe("deprecated")
    expect(registryExpertStatusSchema.parse("disabled")).toBe("disabled")
  })

  it("rejects invalid status values", () => {
    expect(() => registryExpertStatusSchema.parse("invalid")).toThrow()
  })
})

describe("ownerSchema", () => {
  it("parses valid owner with name", () => {
    const owner = ownerSchema.parse({
      name: "test-org",
      organizationId: "org123456789",
      createdAt: "2024-01-01T00:00:00Z",
    })
    expect(owner.name).toBe("test-org")
    expect(owner.organizationId).toBe("org123456789")
    expect(owner.createdAt).toBeInstanceOf(Date)
  })

  it("parses valid owner without name", () => {
    const owner = ownerSchema.parse({
      organizationId: "org123456789",
      createdAt: "2024-01-01T00:00:00Z",
    })
    expect(owner.name).toBeUndefined()
    expect(owner.organizationId).toBe("org123456789")
  })

  it("transforms createdAt to Date", () => {
    const owner = ownerSchema.parse({
      organizationId: "org123",
      createdAt: "2024-06-15T12:30:45Z",
    })
    expect(owner.createdAt).toBeInstanceOf(Date)
    expect(owner.createdAt.toISOString()).toBe("2024-06-15T12:30:45.000Z")
  })
})

describe("registryExpertSchema", () => {
  const validExpert = {
    type: "registryExpert",
    id: "test-id",
    key: "my-expert@1.0.0",
    name: "my-expert",
    minRuntimeVersion: "v1.0",
    description: "Test expert",
    owner: {
      organizationId: "org123",
      createdAt: "2024-01-01T00:00:00Z",
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    version: "1.0.0",
    status: "available",
    instruction: "Test instruction",
    skills: {},
    delegates: [],
    tags: ["latest"],
  }

  it("parses valid expert", () => {
    const expert = registryExpertSchema.parse(validExpert)
    expect(expert.type).toBe("registryExpert")
    expect(expert.name).toBe("my-expert")
    expect(expert.createdAt).toBeInstanceOf(Date)
    expect(expert.updatedAt).toBeInstanceOf(Date)
  })

  it("transforms skills to Record<string, Skill>", () => {
    const expertWithSkills = {
      ...validExpert,
      skills: {
        tool1: { type: "mcpStdioSkill", description: "Test" },
      },
    }
    const expert = registryExpertSchema.parse(expertWithSkills)
    expect(expert.skills).toEqual({ tool1: { type: "mcpStdioSkill", description: "Test" } })
  })

  it("rejects invalid type", () => {
    expect(() => registryExpertSchema.parse({ ...validExpert, type: "invalid" })).toThrow()
  })

  it("rejects invalid minRuntimeVersion", () => {
    expect(() =>
      registryExpertSchema.parse({ ...validExpert, minRuntimeVersion: "v2.0" }),
    ).toThrow()
  })
})

describe("expertDigestSchema", () => {
  const validDigest = {
    type: "expertDigest",
    id: "test-id",
    key: "my-expert@1.0.0",
    name: "my-expert",
    minRuntimeVersion: "v1.0",
    description: "Test expert",
    owner: {
      organizationId: "org123",
      createdAt: "2024-01-01T00:00:00Z",
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    tags: [],
  }

  it("parses valid digest", () => {
    const digest = expertDigestSchema.parse(validDigest)
    expect(digest.type).toBe("expertDigest")
    expect(digest.version).toBeUndefined()
  })

  it("parses digest with version", () => {
    const digest = expertDigestSchema.parse({ ...validDigest, version: "1.0.0" })
    expect(digest.version).toBe("1.0.0")
  })
})

describe("response schemas", () => {
  const mockExpert = {
    type: "registryExpert",
    id: "test-id",
    key: "my-expert@1.0.0",
    name: "my-expert",
    minRuntimeVersion: "v1.0",
    description: "Test",
    owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    version: "1.0.0",
    status: "available",
    instruction: "Test",
    skills: {},
    delegates: [],
    tags: [],
  }

  describe("getExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = getExpertResponseSchema.parse({
        data: { expert: mockExpert },
      })
      expect(response.data.expert.name).toBe("my-expert")
    })
  })

  describe("listExpertsResponseSchema", () => {
    it("parses valid response", () => {
      const response = listExpertsResponseSchema.parse({
        data: { experts: [mockExpert] },
        meta: { total: 1, take: 100, skip: 0 },
      })
      expect(response.data.experts).toHaveLength(1)
      expect(response.meta.total).toBe(1)
    })
  })

  describe("createExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = createExpertResponseSchema.parse({
        data: { expert: mockExpert },
      })
      expect(response.data.expert.name).toBe("my-expert")
    })
  })

  describe("updateExpertResponseSchema", () => {
    it("parses valid response", () => {
      const response = updateExpertResponseSchema.parse({
        data: { expert: mockExpert },
      })
      expect(response.data.expert.name).toBe("my-expert")
    })
  })

  describe("deleteExpertResponseSchema", () => {
    it("parses empty response", () => {
      const response = deleteExpertResponseSchema.parse({})
      expect(response).toEqual({})
    })
  })

  describe("getExpertVersionsResponseSchema", () => {
    it("parses valid response", () => {
      const digest = {
        type: "expertDigest",
        id: "id-1",
        key: "my-expert@1.0.0",
        name: "my-expert",
        minRuntimeVersion: "v1.0",
        description: "Test",
        owner: { organizationId: "org123", createdAt: "2024-01-01T00:00:00Z" },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        version: "1.0.0",
        tags: ["latest"],
      }
      const response = getExpertVersionsResponseSchema.parse({
        data: { versions: [digest], latest: "1.0.0" },
        meta: { total: 1 },
      })
      expect(response.data.versions).toHaveLength(1)
      expect(response.data.latest).toBe("1.0.0")
      expect(response.meta.total).toBe(1)
    })
  })
})
