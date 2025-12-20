import type { ProviderConfig, ProviderName } from "@perstack/core"
import type { ProviderAdapter, ProviderAdapterOptions } from "@perstack/provider-core"

interface AdapterConstructor {
  new (config: ProviderConfig, options?: ProviderAdapterOptions): ProviderAdapter
}

type AdapterLoader = () => Promise<AdapterConstructor>

export class ProviderNotInstalledError extends Error {
  constructor(providerName: ProviderName) {
    super(
      `Provider "${providerName}" is not installed. ` +
        `Run: npm install @perstack/${providerName}-provider`,
    )
    this.name = "ProviderNotInstalledError"
  }
}

export class ProviderAdapterFactory {
  private static registry = new Map<ProviderName, AdapterLoader>()
  private static instances = new Map<string, ProviderAdapter>()

  static register(providerName: ProviderName, loader: AdapterLoader): void {
    ProviderAdapterFactory.registry.set(providerName, loader)
  }

  static async create(
    config: ProviderConfig,
    options?: ProviderAdapterOptions,
  ): Promise<ProviderAdapter> {
    const cacheKey = ProviderAdapterFactory.getCacheKey(config, options)
    const cached = ProviderAdapterFactory.instances.get(cacheKey)
    if (cached) return cached

    const loader = ProviderAdapterFactory.registry.get(config.providerName)
    if (!loader) {
      throw new ProviderNotInstalledError(config.providerName)
    }

    const AdapterClass = await loader()
    const adapter = new AdapterClass(config, options)
    ProviderAdapterFactory.instances.set(cacheKey, adapter)
    return adapter
  }

  static clearCache(): void {
    ProviderAdapterFactory.instances.clear()
  }

  private static getCacheKey(config: ProviderConfig, options?: ProviderAdapterOptions): string {
    return JSON.stringify({ providerName: config.providerName, proxyUrl: options?.proxyUrl })
  }
}
