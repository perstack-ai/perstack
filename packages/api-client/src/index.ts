// Core exports
export { type ApiClient, createApiClient } from "./client.js"
export { createFetcher, type Fetcher } from "./fetcher.js"
// Registry exports
export { createRegistryExpertsApi, type RegistryExpertsApi } from "./registry/experts.js"
export type {
  CreateExpertInput,
  ExpertDigest as RegistryExpertDigest,
  ListExpertsParams,
  Owner as RegistryOwner,
  RegistryExpert,
  RegistryExpertStatus,
  UpdateExpertInput,
} from "./registry/types.js"
export {
  type CheckpointsApi,
  createStudioExpertJobsApi,
  type StudioExpertJobsApi,
  type WorkspaceInstanceApi,
  type WorkspaceInstanceItemsApi,
} from "./studio/expert-jobs.js"

// Studio exports
export { createStudioExpertsApi, type StudioExpertsApi } from "./studio/experts.js"
export type {
  Application,
  Checkpoint,
  ContinueExpertJobInput,
  CreateStudioExpertInput,
  CreateWorkspaceSecretInput,
  CreateWorkspaceVariableInput,
  ExpertDigest,
  ExpertJob,
  ExpertJobStatus,
  ListCheckpointsParams,
  ListExpertJobsParams,
  ListStudioExpertsParams,
  ListWorkspaceItemsParams,
  Owner,
  StartExpertJobInput,
  StudioExpert,
  UpdateExpertJobInput,
  UpdateStudioExpertInput,
  UpdateWorkspaceVariableInput,
  Workspace,
  WorkspaceInstance,
  WorkspaceItem,
  WorkspaceSecret,
  WorkspaceVariable,
} from "./studio/types.js"
export {
  createStudioWorkspaceApi,
  type StudioWorkspaceApi,
  type WorkspaceItemsApi,
  type WorkspaceSecretsApi,
  type WorkspaceVariablesApi,
} from "./studio/workspace.js"
export type {
  ApiClientConfig,
  ApiError,
  ApiResult,
  PaginatedResult,
  PaginationParams,
  RequestOptions,
} from "./types.js"
