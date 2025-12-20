import type { ProviderConfig, ProviderName } from "@perstack/core"
import type { ProviderAdapter, ProviderAdapterOptions } from "@perstack/provider-core"

interface AdapterConstructor {
  new (config: ProviderConfig, options?: ProviderAdapterOptions): ProviderAdapter
}

type AdapterLoader = () => Promise<AdapterConstructor>

const PROVIDER_PACKAGE_NAMES: Record<ProviderName, string> = {
  anthropic: "anthropic-provider",
  openai: "openai-provider",
  google: "google-provider",
  ollama: "ollama-provider",
  "azure-openai": "azure-openai-provider",
  "amazon-bedrock": "bedrock-provider",
  "google-vertex": "vertex-provider",
  deepseek: "deepseek-provider",
}

export class ProviderNotInstalledError extends Error {
  constructor(providerName: ProviderName) {
    const packageName = PROVIDER_PACKAGE_NAMES[providerName]
    super(
      `Provider "${providerName}" is not installed. ` + `Run: npm install @perstack/${packageName}`,
    )
    this.name = "ProviderNotInstalledError"
  }
}

export class ProviderAdapterFactory {
  private static registry = new Map<ProviderName, AdapterLoader>()
  private static instances = new Map<string, ProviderAdapter>()
  private static pendingCreations = new Map<string, Promise<ProviderAdapter>>()

  static register(providerName: ProviderName, loader: AdapterLoader): void {
    ProviderAdapterFactory.registry.set(providerName, loader)
  }

  static async create(
    config: ProviderConfig,
    options?: ProviderAdapterOptions,
  ): Promise<ProviderAdapter> {
    const cacheKey = ProviderAdapterFactory.getCacheKey(config, options)

    // Check cache first
    const cached = ProviderAdapterFactory.instances.get(cacheKey)
    if (cached) return cached

    // Check if creation is already in progress to prevent race condition
    const pending = ProviderAdapterFactory.pendingCreations.get(cacheKey)
    if (pending) return pending

    const loader = ProviderAdapterFactory.registry.get(config.providerName)
    if (!loader) {
      throw new ProviderNotInstalledError(config.providerName)
    }

    // Create adapter and track the pending promise
    const creationPromise = (async () => {
      try {
        const AdapterClass = await loader()
        const adapter = new AdapterClass(config, options)
        ProviderAdapterFactory.instances.set(cacheKey, adapter)
        return adapter
      } finally {
        ProviderAdapterFactory.pendingCreations.delete(cacheKey)
      }
    })()

    ProviderAdapterFactory.pendingCreations.set(cacheKey, creationPromise)
    return creationPromise
  }

  static clearCache(): void {
    ProviderAdapterFactory.instances.clear()
    ProviderAdapterFactory.pendingCreations.clear()
  }

  private static getCacheKey(config: ProviderConfig, options?: ProviderAdapterOptions): string {
    return JSON.stringify({
      providerName: config.providerName,
      apiKey: "apiKey" in config ? config.apiKey : undefined,
      baseUrl: "baseUrl" in config ? config.baseUrl : undefined,
      proxyUrl: options?.proxyUrl,
    })
  }
}
