export const defaultPerstackApiBaseUrl = "https://api.perstack.ai"

// Organization
export const organizationNameRegex = /^[a-z0-9][a-z0-9_\.-]*$/
export const maxOrganizationNameLength = 128

// Application
export const maxApplicationNameLength = 255

// Expert
export const expertKeyRegex =
  /^((?:@[a-z0-9][a-z0-9_\.-]*\/)?[a-z0-9][a-z0-9_\.-]*)(?:@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?)|@([a-z0-9][a-z0-9_\.-]*))?$/
export const expertNameRegex = /^(@[a-z0-9][a-z0-9_-]*\/)?[a-z0-9][a-z0-9_-]*$/
export const expertVersionRegex =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/
export const tagNameRegex = /^[a-z0-9][a-z0-9_-]*$/
export const maxExpertNameLength = 255
export const maxExpertVersionTagLength = 255
export const maxExpertKeyLength = 511
export const maxExpertDescriptionLength = 1024 * 2
export const maxExpertInstructionLength = 1024 * 20
export const maxExpertSkillItems = 255
export const maxExpertDelegateItems = 255
export const maxExpertTagItems = 8
export const defaultTemperature = 0.0
export const defaultMaxSteps = undefined
export const defaultMaxRetries = 5
export const defaultTimeout = 5 * 1000 * 60

// ExpertJob
export const maxExpertJobQueryLength = 1024 * 20
export const maxExpertJobFileNameLength = 1024 * 10

// Skill
export const packageWithVersionRegex =
  /^(?:@[a-z0-9][a-z0-9_\.-]*\/)?[a-z0-9][a-z0-9_\.-]*(?:@(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?|@[a-z0-9][a-z0-9_\.-]*)?$/
export const urlSafeRegex = /^[a-z0-9][a-z0-9_-]*$/
export const maxSkillNameLength = 255
export const maxSkillDescriptionLength = 1024 * 2
export const maxSkillRuleLength = 1024 * 2
export const maxSkillPickOmitItems = 255
export const maxSkillRequiredEnvItems = 255
export const maxSkillToolNameLength = 255
export const maxSkillEndpointLength = 1024 * 2
export const maxSkillInputJsonSchemaLength = 1024 * 20
export const maxSkillToolItems = 255

// Checkpoint
export const maxCheckpointToolCallIdLength = 255

// Workspace
export const envNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/
export const maxEnvNameLength = 255
