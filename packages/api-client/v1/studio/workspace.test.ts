import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { api } from "../../test/mock-api.js"
import {
  assertWorkspace,
  assertWorkspaceItemDirectory,
  assertWorkspaceItemFile,
  workspace,
  workspaceItemDirectory,
  workspaceItemFile,
} from "../../test/test-data.js"
import { ApiV1Client } from "../client.js"
import {
  type CreateWorkspaceItemInput,
  type DownloadWorkspaceItemInput,
  type GetWorkspaceItemInput,
  type GetWorkspaceItemsInput,
  createWorkspaceItem,
  downloadWorkspaceItem,
  getWorkspace,
  getWorkspaceItem,
  getWorkspaceItems,
} from "./workspace.js"

describe("@perstack/api-client: Studio", () => {
  beforeAll(() => api.start())
  afterAll(() => api.stop())
  afterEach(() => api.reset())

  describe("getWorkspace", () => {
    it("should get a workspace", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      api.get("/api/studio/v1/workspace", { data: { workspace } }, 200)
      await expect(getWorkspace(client)).resolves.toEqual({
        workspace: assertWorkspace,
      })
    })
  })

  describe("createWorkspaceItem", () => {
    it("should create a workspace directory item", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: CreateWorkspaceItemInput = {
        type: "workspaceItemDirectory",
        permission: "readOnly",
        path: "test",
      }
      api.post(
        "/api/studio/v1/workspace/items",
        { data: { workspaceItem: workspaceItemDirectory } },
        200,
      )
      await expect(createWorkspaceItem(input, client)).resolves.toEqual({
        workspaceItem: assertWorkspaceItemDirectory,
      })
    })

    it("should create a workspace file item", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: CreateWorkspaceItemInput = {
        type: "workspaceItemFile",
        permission: "readOnly",
        path: "test",
        file: new File(["test content"], "test.txt", { type: "text/plain" }),
      }
      api.post(
        "/api/studio/v1/workspace/items",
        { data: { workspaceItem: workspaceItemFile } },
        200,
      )
      await expect(createWorkspaceItem(input, client)).resolves.toEqual({
        workspaceItem: assertWorkspaceItemFile,
      })
    })
  })

  describe("getWorkspaceItem", () => {
    it("should get a workspace item", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetWorkspaceItemInput = {
        itemId: "workspaceitemdirectory12",
      }
      api.get(
        "/api/studio/v1/workspace/items/workspaceitemdirectory12",
        { data: { workspaceItem: workspaceItemDirectory } },
        200,
      )
      await expect(getWorkspaceItem(input, client)).resolves.toEqual({
        workspaceItem: assertWorkspaceItemDirectory,
      })
    })
  })

  describe("getWorkspaceItems", () => {
    it("should get multiple workspace items", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: GetWorkspaceItemsInput = {
        take: 10,
        skip: 0,
      }
      api.get(
        "/api/studio/v1/workspace/items",
        {
          data: { workspaceItems: [workspaceItemDirectory] },
          meta: { total: 1, take: 10, skip: 0 },
        },
        200,
      )
      await expect(getWorkspaceItems(input, client)).resolves.toEqual({
        workspaceItems: [assertWorkspaceItemDirectory],
        total: 1,
        take: 10,
        skip: 0,
      })
    })
  })

  describe("downloadWorkspaceItem", () => {
    it("should download a workspace item", async () => {
      const client = new ApiV1Client({ baseUrl: "https://mock", apiKey: "test" })
      const input: DownloadWorkspaceItemInput = {
        itemId: "workspaceitemdirectory12",
      }
      api.getBlob(
        "/api/studio/v1/workspace/items/workspaceitemdirectory12/download",
        new Blob(["test content"], { type: "text/plain" }),
        200,
      )
      await expect(downloadWorkspaceItem(input, client)).resolves.toEqual(
        new Blob(["test content"], { type: "text/plain" }),
      )
    })
  })
})
