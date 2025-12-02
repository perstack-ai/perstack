import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { api } from "../../test/mock-api.js"
import {
  assertExpertDigest,
  assertStudioExpert,
  expertDigest,
  studioExpert,
} from "../../test/test-data.js"
import { ApiV1Client } from "../client.js"
import {
  type CreateStudioExpertInput,
  createStudioExpert,
  type DeleteStudioExpertInput,
  deleteStudioExpert,
  type GetStudioExpertInput,
  type GetStudioExpertsInput,
  getStudioExpert,
  getStudioExperts,
  type UpdateStudioExpertInput,
  updateStudioExpert,
} from "./experts.js"

describe("@perstack/api-client: Studio", () => {
  beforeAll(() => api.start())
  afterAll(() => api.stop())
  afterEach(() => api.reset())

  describe("createStudioExpert", () => {
    it("should create a studio expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: CreateStudioExpertInput = {
        name: "test",
        minRuntimeVersion: "v1.0",
        description: "test",
        instruction: "test",
        skills: {},
        delegates: [],
        forkFrom: "test",
      }
      api.post("/api/studio/v1/experts", { data: { expert: studioExpert } }, 200)
      await expect(createStudioExpert(input, client)).resolves.toEqual({
        expert: assertStudioExpert,
      })
    })
  })

  describe("getStudioExpert", () => {
    it("should get a studio expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetStudioExpertInput = {
        expertKey: "test",
      }
      api.get("/api/studio/v1/experts/test", { data: { expert: studioExpert } }, 200)
      await expect(getStudioExpert(input, client)).resolves.toEqual({
        expert: assertStudioExpert,
      })
    })
  })

  describe("getStudioExperts", () => {
    it("should get multiple studio experts", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetStudioExpertsInput = {
        take: 10,
        skip: 0,
        sort: "createdAt",
        order: "desc",
      }
      api.get(
        "/api/studio/v1/experts",
        { data: { experts: [expertDigest] }, meta: { total: 1, take: 10, skip: 0 } },
        200,
      )
      const result = await getStudioExperts(input, client)
      expect(result.experts).toEqual(expect.arrayContaining([assertExpertDigest]))
      expect(result.total).toBe(1)
      expect(result.take).toBe(10)
      expect(result.skip).toBe(0)
    })
  })

  describe("updateStudioExpert", () => {
    it("should update a studio expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: UpdateStudioExpertInput = {
        expertKey: "test",
        minRuntimeVersion: "v1.0",
        description: "updated test",
        instruction: "updated test",
        skills: {},
        delegates: [],
        forkFrom: "test",
      }
      api.post(
        "/api/studio/v1/experts/test",
        {
          data: {
            expert: {
              ...studioExpert,
              description: "updated test",
              instruction: "updated test",
            },
          },
        },
        200,
      )
      await expect(updateStudioExpert(input, client)).resolves.toEqual({
        expert: {
          ...assertStudioExpert,
          description: "updated test",
          instruction: "updated test",
        },
      })
    })
  })

  describe("deleteStudioExpert", () => {
    it("should delete a studio expert", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: DeleteStudioExpertInput = {
        expertKey: "test",
      }
      api.delete("/api/studio/v1/experts/test", {}, 200)
      await expect(deleteStudioExpert(input, client)).resolves.toEqual(undefined)
    })
  })
})
