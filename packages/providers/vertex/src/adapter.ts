import { createVertex } from "@ai-sdk/google-vertex"
import type { GoogleVertexProviderConfig } from "@perstack/core"
import { BaseProviderAdapter, type ProviderAdapterOptions } from "@perstack/provider-core"
import type { LanguageModel } from "ai"

export class VertexProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "google-vertex" as const
  private readonly client: ReturnType<typeof createVertex>

  constructor(
    private readonly config: GoogleVertexProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createVertex({
      project: config.project,
      location: config.location,
      baseURL: config.baseUrl,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }
}
