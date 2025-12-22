import { S3Client } from "@aws-sdk/client-s3"
import { S3StorageBase } from "@perstack/s3-compatible-storage"

export interface R2StorageConfig {
  accountId: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  prefix?: string
}

export class R2Storage extends S3StorageBase {
  constructor(config: R2StorageConfig) {
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    super({
      client,
      bucket: config.bucket,
      prefix: config.prefix,
    })
  }
}
