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

// Module-level state for provider adapter factory
const adapterRegistry = new Map<ProviderName, AdapterLoader>()
const adapterInstances = new Map<string, ProviderAdapter>()
const pendingCreations = new Map<string, Promise<ProviderAdapter>>()

function getCacheKey(config: ProviderConfig, options?: ProviderAdapterOptions): string {
  return JSON.stringify({
    providerName: config.providerName,
    apiKey: "apiKey" in config ? config.apiKey : undefined,
    baseUrl: "baseUrl" in config ? config.baseUrl : undefined,
    proxyUrl: options?.proxyUrl,
  })
}

export function registerProviderAdapter(providerName: ProviderName, loader: AdapterLoader): void {
  adapterRegistry.set(providerName, loader)
}

export async function createProviderAdapter(
  config: ProviderConfig,
  options?: ProviderAdapterOptions,
): Promise<ProviderAdapter> {
  const cacheKey = getCacheKey(config, options)

  // Check cache first
  const cached = adapterInstances.get(cacheKey)
  if (cached) return cached

  // Check if creation is already in progress to prevent race condition
  const pending = pendingCreations.get(cacheKey)
  if (pending) return pending

  const loader = adapterRegistry.get(config.providerName)
  if (!loader) {
    throw new ProviderNotInstalledError(config.providerName)
  }

  // Create adapter and track the pending promise
  const creationPromise = (async () => {
    try {
      const AdapterClass = await loader()
      const adapter = new AdapterClass(config, options)
      adapterInstances.set(cacheKey, adapter)
      return adapter
    } finally {
      pendingCreations.delete(cacheKey)
    }
  })()

  pendingCreations.set(cacheKey, creationPromise)
  return creationPromise
}

export function clearProviderAdapterCache(): void {
  adapterInstances.clear()
  pendingCreations.clear()
}
