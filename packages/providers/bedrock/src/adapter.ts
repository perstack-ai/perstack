import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"
import type { AmazonBedrockProviderConfig } from "@perstack/core"
import { BaseProviderAdapter, type ProviderAdapterOptions } from "@perstack/provider-core"
import type { LanguageModel } from "ai"

export class BedrockProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "amazon-bedrock" as const
  private readonly client: ReturnType<typeof createAmazonBedrock>

  constructor(
    private readonly config: AmazonBedrockProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createAmazonBedrock({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      sessionToken: config.sessionToken,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }
}
