import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3"
import { S3StorageBase } from "@perstack/s3-compatible-storage"

export interface S3StorageConfig {
  bucket: string
  region: string
  prefix?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
  endpoint?: string
  forcePathStyle?: boolean
}

export class S3Storage extends S3StorageBase {
  constructor(config: S3StorageConfig) {
    const clientConfig: S3ClientConfig = {
      region: config.region,
    }
    if (config.credentials) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      }
    }
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint
    }
    if (config.forcePathStyle) {
      clientConfig.forcePathStyle = config.forcePathStyle
    }
    const client = new S3Client(clientConfig)
    super({
      client,
      bucket: config.bucket,
      prefix: config.prefix,
    })
  }
}
