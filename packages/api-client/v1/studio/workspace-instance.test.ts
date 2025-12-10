import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { api } from "../../test/mock-api.js"
import { assertExpertJob, expertJob } from "../../test/test-data.js"
import { ApiV1Client } from "../client.js"
import {
  type ContinueExpertJobInput,
  continueExpertJob,
  type GetExpertJobInput,
  type GetExpertJobsInput,
  getExpertJob,
  getExpertJobs,
  type ResumeExpertJobFromCheckpointInput,
  resumeExpertJobFromCheckpoint,
  type StartExpertJobInput,
  startExpertJob,
} from "./expert-jobs.js"

describe("@perstack/api-client: Studio", () => {
  beforeAll(() => api.start())
  afterAll(() => api.stop())
  afterEach(() => api.reset())

  describe("startExpertJob", () => {
    it("should start an expert job", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: StartExpertJobInput = {
        expertKey: "test",
        query: "test",
        files: [],
        model: "test",
        temperature: 0.5,
        maxSteps: 10,
        maxRetries: 3,
      }
      api.post("/api/studio/v1/expert_jobs", { data: { expertJob } }, 200)
      await expect(startExpertJob(input, client)).resolves.toEqual({
        expertJob: assertExpertJob,
      })
    })
  })

  describe("continueExpertJob", () => {
    it("should continue an expert job", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: ContinueExpertJobInput = {
        expertJobId: "expertjob123456789012345",
        query: "test",
        files: [],
        model: "test",
        temperature: 0.5,
        maxSteps: 10,
        maxRetries: 3,
      }
      api.post(
        "/api/studio/v1/expert_jobs/expertjob123456789012345/continue",
        { data: { expertJob } },
        200,
      )
      await expect(continueExpertJob(input, client)).resolves.toEqual({
        expertJob: assertExpertJob,
      })
    })
  })

  describe("resumeExpertJobFromCheckpoint", () => {
    it("should resume an expert job from a checkpoint", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: ResumeExpertJobFromCheckpointInput = {
        expertJobId: "expertjob123456789012345",
        checkpointId: "checkpoint12345678901234",
        query: "test",
        files: [],
        model: "test",
        temperature: 0.5,
        maxSteps: 10,
        maxRetries: 3,
      }
      api.post(
        "/api/studio/v1/expert_jobs/expertjob123456789012345/resume_from",
        { data: { expertJob } },
        200,
      )
      await expect(resumeExpertJobFromCheckpoint(input, client)).resolves.toEqual({
        expertJob: assertExpertJob,
      })
    })
  })

  describe("getExpertJob", () => {
    it("should get an expert job", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetExpertJobInput = {
        expertJobId: "expertjob123456789012345",
      }
      api.get("/api/studio/v1/expert_jobs/expertjob123456789012345", { data: { expertJob } }, 200)
      await expect(getExpertJob(input, client)).resolves.toEqual({
        expertJob: assertExpertJob,
      })
    })
  })

  describe("getExpertJobs", () => {
    it("should get multiple expert jobs", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetExpertJobsInput = {
        take: 10,
        skip: 0,
        sort: "createdAt",
        order: "desc",
        filter: "test",
      }
      api.get(
        "/api/studio/v1/expert_jobs",
        { data: { expertJobs: [expertJob] }, meta: { total: 1, take: 10, skip: 0 } },
        200,
      )
      const result = await getExpertJobs(input, client)
      expect(result.expertJobs).toEqual(expect.arrayContaining([assertExpertJob]))
      expect(result.total).toBe(1)
      expect(result.take).toBe(10)
      expect(result.skip).toBe(0)
    })
  })
})
