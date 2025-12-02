import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { api } from "../../test/mock-api.js"
import {
  assertExpertDigest,
  assertRegistryExpert,
  expertDigest,
  registryExpert,
} from "../../test/test-data.js"
import { ApiV1Client } from "../client.js"
import {
  type CreateRegistryExpertInput,
  type DeleteRegistryExpertInput,
  type GetRegistryExpertInput,
  type GetRegistryExpertVersionsInput,
  type GetRegistryExpertsInput,
  createRegistryExpert,
  deleteRegistryExpert,
  getRegistryExpert,
  getRegistryExpertVersions,
  getRegistryExperts,
} from "./experts.js"

describe("@perstack/api-client: Registry", () => {
  beforeAll(() => api.start())
  afterAll(() => api.stop())
  afterEach(() => api.reset())

  describe("createRegistryExpert", () => {
    it("should create a registry expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: CreateRegistryExpertInput = {
        name: "test",
        version: "1.0.0",
        minRuntimeVersion: "v1.0",
        description: "test",
        instruction: "test",
        skills: {},
        delegates: [],
        tags: [],
      }
      api.post("/api/registry/v1/experts", { data: { expert: registryExpert } }, 200)
      await expect(createRegistryExpert(input, client)).resolves.toEqual({
        expert: assertRegistryExpert,
      })
    })
  })

  describe("getRegistryExpert", () => {
    it("should get a registry expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetRegistryExpertInput = {
        expertKey: "test",
      }
      api.get("/api/registry/v1/experts/test", { data: { expert: registryExpert } }, 200)
      await expect(getRegistryExpert(input, client)).resolves.toEqual({
        expert: assertRegistryExpert,
      })
    })
  })

  describe("getRegistryExperts", () => {
    it("should get multiple registry experts", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetRegistryExpertsInput = {
        take: 10,
        skip: 0,
        sort: "createdAt",
        order: "desc",
        filter: "test",
        organizationId: "test",
      }
      api.get(
        "/api/registry/v1/experts",
        { data: { experts: [registryExpert] }, meta: { total: 1, take: 10, skip: 0 } },
        200,
      )
      const result = await getRegistryExperts(input, client)
      expect(result.experts).toEqual(expect.arrayContaining([assertRegistryExpert]))
      expect(result.total).toBe(1)
      expect(result.take).toBe(10)
      expect(result.skip).toBe(0)
    })
  })

  describe("getRegistryExpertVersions", () => {
    it("should get multiple registry expert versions", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetRegistryExpertVersionsInput = {
        expertKey: "test",
      }
      api.get(
        "/api/registry/v1/experts/test/versions",
        { data: { versions: [expertDigest], latest: "1.0.0" }, meta: { total: 1 } },
        200,
      )
      const result = await getRegistryExpertVersions(input, client)
      expect(result.versions).toEqual(expect.arrayContaining([assertExpertDigest]))
      expect(result.latest).toBe("1.0.0")
      expect(result.total).toBe(1)
    })
  })

  describe("deleteRegistryExpert", () => {
    it("should delete a registry expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: DeleteRegistryExpertInput = {
        expertKey: "test",
      }
      api.delete("/api/registry/v1/experts/test", {}, 200)
      await expect(deleteRegistryExpert(input, client)).resolves.toEqual(undefined)
    })
  })
})
