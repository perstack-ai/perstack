import { createFetcher } from "./fetcher.js"
import { createRegistryExpertsApi, type RegistryExpertsApi } from "./registry/experts.js"
import { createStudioExpertJobsApi, type StudioExpertJobsApi } from "./studio/expert-jobs.js"
import { createStudioExpertsApi, type StudioExpertsApi } from "./studio/experts.js"
import { createStudioWorkspaceApi, type StudioWorkspaceApi } from "./studio/workspace.js"
import type { ApiClientConfig } from "./types.js"

export interface ApiClient {
  registry: {
    experts: RegistryExpertsApi
  }
  studio: {
    experts: StudioExpertsApi
    expertJobs: StudioExpertJobsApi
    workspace: StudioWorkspaceApi
  }
}

export function createApiClient(config?: ApiClientConfig): ApiClient {
  const fetcher = createFetcher(config)

  return {
    registry: {
      experts: createRegistryExpertsApi(fetcher),
    },
    studio: {
      experts: createStudioExpertsApi(fetcher),
      expertJobs: createStudioExpertJobsApi(fetcher),
      workspace: createStudioWorkspaceApi(fetcher),
    },
  }
}
