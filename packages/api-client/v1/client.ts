import {
  type CreateRegistryExpertInput,
  createRegistryExpert,
  type DeleteRegistryExpertInput,
  deleteRegistryExpert,
  type GetRegistryExpertInput,
  type GetRegistryExpertsInput,
  type GetRegistryExpertVersionsInput,
  getRegistryExpert,
  getRegistryExperts,
  getRegistryExpertVersions,
  type UpdateRegistryExpertInput,
  updateRegistryExpert,
} from "./registry/experts.js"
import {
  type ContinueExpertJobInput,
  type CreateCheckpointInput,
  continueExpertJob,
  createCheckpoint,
  type GetCheckpointInput,
  type GetCheckpointsInput,
  type GetExpertJobInput,
  type GetExpertJobsInput,
  getCheckpoint,
  getCheckpoints,
  getExpertJob,
  getExpertJobs,
  type ResumeExpertJobFromCheckpointInput,
  resumeExpertJobFromCheckpoint,
  type StartExpertJobInput,
  startExpertJob,
  type UpdateExpertJobInput,
  updateExpertJob,
} from "./studio/expert-jobs.js"
import {
  type CreateStudioExpertInput,
  createStudioExpert,
  type DeleteStudioExpertInput,
  deleteStudioExpert,
  type GetStudioExpertInput,
  type GetStudioExpertsInput,
  getStudioExpert,
  getStudioExperts,
  type UpdateStudioExpertInput,
  updateStudioExpert,
} from "./studio/experts.js"
import {
  type CreateWorkspaceItemInput,
  type CreateWorkspaceSecretInput,
  type CreateWorkspaceVariableInput,
  createWorkspaceItem,
  createWorkspaceSecret,
  createWorkspaceVariable,
  type DeleteWorkspaceItemInput,
  type DeleteWorkspaceSecretInput,
  type DeleteWorkspaceVariableInput,
  type DownloadWorkspaceItemInput,
  deleteWorkspaceItem,
  deleteWorkspaceSecret,
  deleteWorkspaceVariable,
  downloadWorkspaceItem,
  type GetWorkspaceItemInput,
  type GetWorkspaceItemsInput,
  getWorkspace,
  getWorkspaceItem,
  getWorkspaceItems,
  type UpdateWorkspaceItemInput,
  type UpdateWorkspaceVariableInput,
  updateWorkspaceItem,
  updateWorkspaceVariable,
} from "./studio/workspace.js"
import {
  type CreateWorkspaceInstanceItemInput,
  createWorkspaceInstanceItem,
  type DeleteWorkspaceInstanceItemInput,
  type DownloadWorkspaceInstanceItemInput,
  deleteWorkspaceInstanceItem,
  downloadWorkspaceInstanceItem,
  type FindWorkspaceInstanceItemsInput,
  findWorkspaceInstanceItems,
  type GetWorkspaceInstanceInput,
  type GetWorkspaceInstanceItemInput,
  type GetWorkspaceInstanceItemsInput,
  getWorkspaceInstance,
  getWorkspaceInstanceItem,
  getWorkspaceInstanceItems,
  type UpdateWorkspaceInstanceItemInput,
  updateWorkspaceInstanceItem,
} from "./studio/workspace-instance.js"

export type ApiV1Config = {
  baseUrl?: string
  apiKey?: string
}

export class ApiV1Client {
  baseUrl: string
  apiKey?: string

  constructor(config?: ApiV1Config) {
    if (config?.baseUrl && !config.baseUrl.startsWith("https://")) {
      throw new Error("API baseUrl must use HTTPS")
    }
    this.baseUrl = config?.baseUrl ? config.baseUrl : "https://api.perstack.ai"
    this.apiKey = config?.apiKey
  }

  async request<T = unknown>(
    endpoint: string,
    init?: RequestInit,
    schema?: { parse: (data: unknown) => T },
  ): Promise<T> {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const endpointUrl = new URL(endpoint)
      const baseUrlObj = new URL(this.baseUrl)
      if (endpointUrl.origin !== baseUrlObj.origin) {
        throw new Error("Endpoint must use the configured baseUrl")
      }
    }
    const url = new URL(endpoint, this.baseUrl)
    const response = await fetch(url.toString(), init)
    if (!response.ok) {
      throw new Error(`Failed to request ${url.toString()}: ${response.statusText}`)
    }
    const data = await response.json()
    if (schema) {
      return schema.parse(data)
    }
    return data as T
  }

  async requestAuthenticated<T = unknown>(
    endpoint: string,
    init?: RequestInit,
    schema?: { parse: (data: unknown) => T },
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("API key is not set")
    }
    return this.request(
      endpoint,
      {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
      schema,
    )
  }

  async requestBlob(endpoint: string, init?: RequestInit): Promise<Blob> {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const endpointUrl = new URL(endpoint)
      const baseUrlObj = new URL(this.baseUrl)
      if (endpointUrl.origin !== baseUrlObj.origin) {
        throw new Error("Endpoint must use the configured baseUrl")
      }
    }
    const url = new URL(endpoint, this.baseUrl)
    const response = await fetch(url.toString(), init)
    if (!response.ok) {
      throw new Error(`Failed to request ${url.toString()}: ${response.statusText}`)
    }
    return await response.blob()
  }

  async requestBlobAuthenticated(endpoint: string, init?: RequestInit): Promise<Blob> {
    if (!this.apiKey) {
      throw new Error("API key is not set")
    }
    return this.requestBlob(endpoint, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${this.apiKey}`, // Override
      },
    })
  }

  registry = {
    experts: {
      create: (input: CreateRegistryExpertInput) => createRegistryExpert(input, this),
      get: (input: GetRegistryExpertInput) => getRegistryExpert(input, this),
      getMany: (input: GetRegistryExpertsInput) => getRegistryExperts(input, this),
      getVersions: (input: GetRegistryExpertVersionsInput) =>
        getRegistryExpertVersions(input, this),
      update: (input: UpdateRegistryExpertInput) => updateRegistryExpert(input, this),
      delete: (input: DeleteRegistryExpertInput) => deleteRegistryExpert(input, this),
    },
  }
  studio = {
    experts: {
      create: (input: CreateStudioExpertInput) => createStudioExpert(input, this),
      get: (input: GetStudioExpertInput) => getStudioExpert(input, this),
      getMany: (input: GetStudioExpertsInput) => getStudioExperts(input, this),
      update: (input: UpdateStudioExpertInput) => updateStudioExpert(input, this),
      delete: (input: DeleteStudioExpertInput) => deleteStudioExpert(input, this),
    },
    expertJobs: {
      start: (input: StartExpertJobInput) => startExpertJob(input, this),
      continue: (input: ContinueExpertJobInput) => continueExpertJob(input, this),
      resumeFromCheckpoint: (input: ResumeExpertJobFromCheckpointInput) =>
        resumeExpertJobFromCheckpoint(input, this),
      get: (input: GetExpertJobInput) => getExpertJob(input, this),
      getMany: (input: GetExpertJobsInput) => getExpertJobs(input, this),
      update: (input: UpdateExpertJobInput) => updateExpertJob(input, this),
      checkpoints: {
        create: (input: CreateCheckpointInput) => createCheckpoint(input, this),
        get: (input: GetCheckpointInput) => getCheckpoint(input, this),
        getMany: (input: GetCheckpointsInput) => getCheckpoints(input, this),
      },
      workspaceInstance: {
        get: (input: GetWorkspaceInstanceInput) => getWorkspaceInstance(input, this),
        items: {
          create: (input: CreateWorkspaceInstanceItemInput) =>
            createWorkspaceInstanceItem(input, this),
          get: (input: GetWorkspaceInstanceItemInput) => getWorkspaceInstanceItem(input, this),
          getMany: (input: GetWorkspaceInstanceItemsInput) =>
            getWorkspaceInstanceItems(input, this),
          find: (input: FindWorkspaceInstanceItemsInput) => findWorkspaceInstanceItems(input, this),
          download: (input: DownloadWorkspaceInstanceItemInput) =>
            downloadWorkspaceInstanceItem(input, this),
          update: (input: UpdateWorkspaceInstanceItemInput) =>
            updateWorkspaceInstanceItem(input, this),
          delete: (input: DeleteWorkspaceInstanceItemInput) =>
            deleteWorkspaceInstanceItem(input, this),
        },
      },
    },
    workspace: {
      get: () => getWorkspace(this),
      items: {
        create: (input: CreateWorkspaceItemInput) => createWorkspaceItem(input, this),
        get: (input: GetWorkspaceItemInput) => getWorkspaceItem(input, this),
        getMany: (input: GetWorkspaceItemsInput) => getWorkspaceItems(input, this),
        download: (input: DownloadWorkspaceItemInput) => downloadWorkspaceItem(input, this),
        update: (input: UpdateWorkspaceItemInput) => updateWorkspaceItem(input, this),
        delete: (input: DeleteWorkspaceItemInput) => deleteWorkspaceItem(input, this),
      },
      variables: {
        create: (input: CreateWorkspaceVariableInput) => createWorkspaceVariable(input, this),
        update: (input: UpdateWorkspaceVariableInput) => updateWorkspaceVariable(input, this),
        delete: (input: DeleteWorkspaceVariableInput) => deleteWorkspaceVariable(input, this),
      },
      secrets: {
        create: (input: CreateWorkspaceSecretInput) => createWorkspaceSecret(input, this),
        delete: (input: DeleteWorkspaceSecretInput) => deleteWorkspaceSecret(input, this),
      },
    },
  }
}
