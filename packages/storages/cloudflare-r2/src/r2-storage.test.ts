import { describe, expect, it, vi } from "vitest"
import { R2Storage } from "./r2-storage.js"

vi.mock("@aws-sdk/client-s3", () => {
  const storage = new Map<string, string>()

  const mockSend = vi.fn().mockImplementation(async (command: unknown) => {
    const cmd = command as { constructor: { name: string }; input: Record<string, unknown> }
    const name = cmd.constructor.name

    if (name === "PutObjectCommand") {
      const input = cmd.input as { Key: string; Body: string }
      storage.set(input.Key, input.Body)
      return {}
    }

    if (name === "GetObjectCommand") {
      const input = cmd.input as { Key: string }
      const body = storage.get(input.Key)
      if (!body) {
        const error = new Error("NoSuchKey")
        ;(error as { name: string }).name = "NoSuchKey"
        throw error
      }
      return {
        Body: {
          transformToString: async () => body,
        },
      }
    }

    if (name === "ListObjectsV2Command") {
      const input = cmd.input as { Prefix: string }
      const contents = Array.from(storage.keys())
        .filter((key) => key.startsWith(input.Prefix))
        .map((key) => ({ Key: key }))
      return {
        Contents: contents,
        NextContinuationToken: undefined,
      }
    }

    if (name === "DeleteObjectCommand") {
      const input = cmd.input as { Key: string }
      storage.delete(input.Key)
      return {}
    }

    return {}
  })

  class MockS3Client {
    send = mockSend
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: class {
      constructor(public input: unknown) {}
    },
    GetObjectCommand: class {
      constructor(public input: unknown) {}
    },
    ListObjectsV2Command: class {
      constructor(public input: unknown) {}
    },
    DeleteObjectCommand: class {
      constructor(public input: unknown) {}
    },
  }
})

describe("R2Storage", () => {
  it("creates instance with required config", () => {
    const storage = new R2Storage({
      accountId: "test-account-id",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    })
    expect(storage).toBeInstanceOf(R2Storage)
  })

  it("creates instance with optional prefix", () => {
    const storage = new R2Storage({
      accountId: "test-account-id",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      prefix: "perstack/",
    })
    expect(storage).toBeInstanceOf(R2Storage)
  })

  it("inherits all Storage interface methods from S3StorageBase", () => {
    const storage = new R2Storage({
      accountId: "test-account-id",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    })
    expect(typeof storage.storeCheckpoint).toBe("function")
    expect(typeof storage.retrieveCheckpoint).toBe("function")
    expect(typeof storage.getCheckpointsByJobId).toBe("function")
    expect(typeof storage.storeEvent).toBe("function")
    expect(typeof storage.getEventsByRun).toBe("function")
    expect(typeof storage.getEventContents).toBe("function")
    expect(typeof storage.storeJob).toBe("function")
    expect(typeof storage.retrieveJob).toBe("function")
    expect(typeof storage.getAllJobs).toBe("function")
    expect(typeof storage.storeRunSetting).toBe("function")
    expect(typeof storage.getAllRuns).toBe("function")
  })
})
