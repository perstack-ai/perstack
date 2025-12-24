# @perstack/core

## 0.0.28

### Patch Changes

- [#261](https://github.com/perstack-ai/perstack/pull/261) [`880aede`](https://github.com/perstack-ai/perstack/commit/880aede6bef119463edb4b121a8faa96dcf29ece) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Internal improvements and maintenance updates

## 0.0.27

### Patch Changes

- [#248](https://github.com/perstack-ai/perstack/pull/248) [`d6b7d4d`](https://github.com/perstack-ai/perstack/commit/d6b7d4d34fa9f92c57d324884e4fa6603ec577a1) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add `perstack log` command for viewing execution history and events.

  This command enables developers and AI agents to inspect job/run history for debugging purposes. Features include:

  - View events by job, run, or checkpoint
  - Filter events by type, step number, or custom expressions
  - Preset filters for errors, tools, and delegations
  - Human-readable terminal output with colors
  - JSON output for machine parsing
  - Summary view for quick diagnosis

- [#235](https://github.com/perstack-ai/perstack/pull/235) [`90b86c0`](https://github.com/perstack-ai/perstack/commit/90b86c0e503dac95a3d6bc1a29a6f5d8d35dd666) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - feat: bundle @perstack/base into runtime with InMemoryTransport

  Eliminates ~500ms startup latency for the base skill by using in-process MCP communication via InMemoryTransport. The bundled base skill now runs in the same process as the runtime, achieving near-zero initialization latency (<50ms).

  Key changes:

  - Added `createBaseServer()` export from @perstack/base for in-process server creation
  - Added `InMemoryTransport` support to transport factory
  - Added `InMemoryBaseSkillManager` for bundled base skill execution
  - Runtime now uses bundled base by default (no version specified)
  - Explicit version pinning (e.g., `@perstack/base@0.0.34`) falls back to npx + StdioTransport

  This is the foundation for #197 (perstack install) which will enable instant Expert startup.

- [#202](https://github.com/perstack-ai/perstack/pull/202) [`0653050`](https://github.com/perstack-ai/perstack/commit/065305088dce72c2cf68873a1485c98183174c78) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - feat: add granular timing metrics to MCP skill initialization

  The `skillConnected` runtime event now includes detailed timing breakdown:

  - `spawnDurationMs` - Time to create transport and spawn process
  - `handshakeDurationMs` - Time for MCP protocol handshake (connect)
  - `toolDiscoveryDurationMs` - Time for listTools() call

  These metrics help identify performance bottlenecks in MCP skill startup.

  **Breaking behavior change**: The semantics of existing fields have changed:

  - `connectDurationMs` now equals `spawnDurationMs + handshakeDurationMs` (previously measured only `connect()` call)
  - `totalDurationMs` now includes `toolDiscoveryDurationMs` (previously captured before `listTools()`)

  Example event output:

  ```json
  {
    "type": "skillConnected",
    "skillName": "@perstack/base",
    "spawnDurationMs": 150,
    "handshakeDurationMs": 8500,
    "toolDiscoveryDurationMs": 1100,
    "connectDurationMs": 8650,
    "totalDurationMs": 9750
  }
  ```

  Relates to #201

- [#240](https://github.com/perstack-ai/perstack/pull/240) [`26e1109`](https://github.com/perstack-ai/perstack/commit/26e11097a65c1b2cc9aa74f48b53026df3eaa4b0) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - feat: introduce `perstack install` command and `perstack.lock` for faster startup

  This feature enables instant LLM inference by pre-collecting tool definitions:

  - Added `perstack install` command that generates `perstack.lock` file
  - Lockfile contains all expert definitions and tool schemas from MCP skills
  - Runtime uses lockfile to skip MCP initialization and start inference immediately
  - Skills are lazily initialized only when their tools are actually called

  Benefits:

  - Near-zero startup latency (from 500ms-6s per skill to <50ms total)
  - Reproducible builds with locked tool definitions
  - Faster production deployments

- [#225](https://github.com/perstack-ai/perstack/pull/225) [`beb1edc`](https://github.com/perstack-ai/perstack/commit/beb1edc7222231ac67cf0653331e4644b162ca8b) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add pluggable LLM provider architecture with ProviderAdapter pattern

  - Introduce `ProviderAdapter` interface and `BaseProviderAdapter` abstract class in `@perstack/provider-core`
  - Add provider-specific adapters for Anthropic, OpenAI, Google, Ollama, Azure OpenAI, Bedrock, Vertex, and DeepSeek
  - Add `LLMExecutor` layer to encapsulate LLM calls with provider-specific error handling and retry logic
  - Add `ProviderAdapterFactory` with dynamic import support for future npm package installation pattern
  - Extend Expert and PerstackConfigExpert schemas to support `providerTools`, `providerSkills`, and `providerToolOptions`
  - Add `createTestContext` helper for improved test ergonomics

- [#236](https://github.com/perstack-ai/perstack/pull/236) [`d88f116`](https://github.com/perstack-ai/perstack/commit/d88f116edbbb8ffa4240066f0bacb70f442e1123) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add native LLM reasoning support (Extended Thinking/Reasoning)

  - Add `reasoningBudget` option to enable test-time scaling
  - Support Anthropic Extended Thinking with thinking block preservation
  - Support OpenAI Reasoning Effort with effort level mapping
  - Support Google Flash Thinking with thinkingBudget configuration
  - Add `ThinkingPart` message type for conversation history
  - Add `thinking` field to `completeRun` event for observability

- [#247](https://github.com/perstack-ai/perstack/pull/247) [`9da758b`](https://github.com/perstack-ai/perstack/commit/9da758b3b59047a7086d5748dbaa586bbd9dbca1) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add S3 and R2 storage backends with unified Storage interface

  - Add `Storage` interface and `EventMeta` type to `@perstack/core`
  - Create `@perstack/s3-compatible-storage` package with shared S3 logic
  - Create `@perstack/s3-storage` package for AWS S3 storage
  - Create `@perstack/r2-storage` package for Cloudflare R2 storage
  - Add `FileSystemStorage` class to `@perstack/filesystem-storage` implementing Storage interface
  - Maintain backward compatibility with existing function exports

- [#241](https://github.com/perstack-ai/perstack/pull/241) [`0831c63`](https://github.com/perstack-ai/perstack/commit/0831c63c1484dd9b0a6c6ce95504d46c05086aa4) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add streaming output events for real-time LLM output display

  - New event types: `startReasoning`, `streamReasoning`, `startRunResult`, `streamRunResult`
  - Fire-and-forget streaming events emitted during LLM generation
  - TUI displays streaming reasoning and run results in real-time
  - Reasoning phase properly completes before result phase
  - Added retry count tracking with configurable limit via `maxRetries`
  - TUI now displays retry events with reason

### Patch Changes

- [#172](https://github.com/perstack-ai/perstack/pull/172) [`7792a8d`](https://github.com/perstack-ai/perstack/commit/7792a8df1aa988ae04c40f4ee737e5086b9cacca) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Change default runtime from `perstack` to `docker` for security-by-default posture.

  **Breaking Changes:**

  - Default runtime is now `docker` instead of `perstack`
  - The `perstack` runtime has been renamed to `local`

  **Migration:**

  If you have `runtime = "perstack"` in your `perstack.toml`, update it to `runtime = "local"`.

  The `docker` runtime provides container isolation and network restrictions by default. Use `--runtime local` only for trusted environments where Docker is not available.

- [#244](https://github.com/perstack-ai/perstack/pull/244) [`edec35e`](https://github.com/perstack-ai/perstack/commit/edec35e728c89ef98873cee9594ecc3a853d3999) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Complete ProviderAdapter implementations for all AI providers

  - Add error normalization and retryability for Azure OpenAI, Bedrock, Vertex, DeepSeek, and Ollama
  - Add provider tools for Google (fileSearch, googleMaps), Azure OpenAI (webSearchPreview, fileSearch, codeInterpreter, imageGeneration), and Vertex (codeExecution, urlContext, googleSearch, enterpriseWebSearch, googleMaps)
  - Add provider options for Bedrock (guardrails, cachePoint), Vertex (safetySettings), and Ollama (think)
  - Add comprehensive unit tests for all providers

  Closes #243

- [#171](https://github.com/perstack-ai/perstack/pull/171) [`5b07fd7`](https://github.com/perstack-ai/perstack/commit/5b07fd7ba21fae211ab38e808881c9bdc80de718) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - feat: display Docker progress and proxy status during perstack start

  When running `perstack start` with `--runtime docker --verbose`, users can now see:

  - Docker image build progress (pulling layers, installing deps)
  - Container startup and health check status
  - Real-time proxy allow/block events for network requests

  This provides better visibility into Docker container lifecycle and helps debug network issues when using the Squid proxy for domain-based allowlist.

  New runtime event types:

  - `dockerBuildProgress` - Image build progress (pulling, building, complete, error)
  - `dockerContainerStatus` - Container status (starting, running, healthy, stopped)
  - `proxyAccess` - Proxy allow/block events with domain and port information

  Example TUI output:

  ```
  Docker Build [runtime] Building    Installing dependencies...
  Docker [proxy] Healthy             Proxy container ready
  Proxy ✓ api.anthropic.com:443
  Proxy ✗ blocked.com:443           Domain not in allowlist
  ```

  Closes #165, #167

- [#210](https://github.com/perstack-ai/perstack/pull/210) [`80a58ed`](https://github.com/perstack-ai/perstack/commit/80a58edf047bc0ef883745afd52173dfc4162669) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix Docker runtime E2E test failure

  - Add `lazyInit` field to perstack.toml schema for MCP skills
  - Change `lazyInit` default from `true` to `false` for more predictable skill initialization
  - Add `.cache` tmpfs mount to Docker compose for npm/npx cache directory

- [#155](https://github.com/perstack-ai/perstack/pull/155) [`f5dc244`](https://github.com/perstack-ai/perstack/commit/f5dc244339238f080661c6e73f652cd737d3c218) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - fix: change --env-path from variadic to repeatable option to fix argument parsing issue

  The `--env-path <envPath...>` variadic option was consuming positional arguments when placed before them. Changed to a repeatable option pattern (`--env-path <path>`) that can be specified multiple times. This fixes E2E test failure for the `--env-path` option.

- [#214](https://github.com/perstack-ai/perstack/pull/214) [`a01ee65`](https://github.com/perstack-ai/perstack/commit/a01ee65fa1932726928744bb625c3196b499a20b) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Ensure lazyInit defaults to false in perstack.toml schema

- [#174](https://github.com/perstack-ai/perstack/pull/174) [`58ddc86`](https://github.com/perstack-ai/perstack/commit/58ddc8690ff6a399a270c487e8035065efa03fb5) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Reject punycode domains (xn-- labels) in allowedDomains to prevent homograph attacks

  Security improvement: Domain pattern validation now detects and rejects internationalized domain names (IDN) encoded as punycode. This prevents potential homograph attacks where malicious domains use similar-looking characters to impersonate legitimate domains.

  Reference: SEC-004

- [#223](https://github.com/perstack-ai/perstack/pull/223) [`90f7de0`](https://github.com/perstack-ai/perstack/commit/90f7de06a92f98df771a71cc663da607f11d8194) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add stopRunByError event for non-retryable API errors (e.g., 401 Unauthorized)

- [#151](https://github.com/perstack-ai/perstack/pull/151) [`51159b6`](https://github.com/perstack-ai/perstack/commit/51159b6e9fabed47134cbb94f1145e950928bca0) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Multi-runtime support and Docker enhancements

  Features:

  - Add Docker runtime adapter with container isolation
  - Add multi-runtime support (cursor, claude-code, gemini)
  - Add create-expert interactive wizard
  - Add @perstack/runner for centralized adapter dispatch
  - Add @perstack/filesystem-storage for modular storage layer
  - Add @perstack/e2e-mcp-server for security testing
  - Add --workspace option for Docker runtime volume mounting
  - Support GitHub URL for --config option

  Security:

  - Comprehensive Docker sandbox hardening
  - Network isolation with HTTPS-only proxy
  - Filesystem isolation with path validation
  - Environment variable filtering
  - SSRF protection (metadata endpoints, private IPs)

  Improvements:

  - Switch Docker WORKDIR to /workspace for natural relative path resolution
  - Reorganize E2E tests with security audit trails
  - Add runtime field to TUI and Registry API
  - Add verbose output for Docker build progress with --verbose flag

## 0.0.22

### Patch Changes

- [#78](https://github.com/perstack-ai/perstack/pull/78) [`654ea63`](https://github.com/perstack-ai/perstack/commit/654ea635245f77baa43020dcab75efe31ab42cf4) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add Job concept as parent container for Runs

  - Add Job schema and jobId to Checkpoint, RunSetting, and Event types
  - Update storage structure to perstack/jobs/{jobId}/runs/{runId}/
  - Update CLI options: --job-id, --continue-job (replacing --continue-run)

## 0.0.21

### Patch Changes

- [#62](https://github.com/perstack-ai/perstack/pull/62) [`3b64f88`](https://github.com/perstack-ai/perstack/commit/3b64f886b2e6f030d0e75d0baf4b51fb4d3747b8) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add parallel tool call support and mixed tool call handling

  Features:

  - Process all tool calls from a single LLM response instead of only the first one
  - MCP tools execute in parallel using `Promise.all`
  - Support mixed tool calls (MCP + Delegate + Interactive in same response)
  - Process tools in priority order: MCP → Delegate → Interactive
  - Preserve partial results across checkpoint boundaries

  Schema Changes:

  - `Step.toolCall` → `Step.toolCalls` (array)
  - `Step.toolResult` → `Step.toolResults` (array)
  - Add `Step.pendingToolCalls` for tracking unprocessed tool calls
  - Add `Checkpoint.pendingToolCalls` and `Checkpoint.partialToolResults` for resume

  Event Changes:

  - `callTool` → `callTools`
  - `resolveToolResult` → `resolveToolResults`
  - Add `resumeToolCalls` and `finishAllToolCalls` events

## 0.0.20

### Patch Changes

- [#51](https://github.com/perstack-ai/perstack/pull/51) [`5497b47`](https://github.com/perstack-ai/perstack/commit/5497b478476ef95688a9cb28cfaf20473e6ae3ce) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add skill lifecycle events for MCP startup debugging

  - Add `skillStarting` event with command and args
  - Add `skillStderr` event for child process stderr output
  - Add `connectDurationMs` and `totalDurationMs` to `skillConnected` event

## 0.0.19

### Patch Changes

- [#45](https://github.com/perstack-ai/perstack/pull/45) [`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add event detail view in history browser

  Users can now select an event in the events list to view its details including type, step number, timestamp, and IDs.

## 0.0.18

### Patch Changes

- [#14](https://github.com/perstack-ai/perstack/pull/14) [`eb2f4cc`](https://github.com/perstack-ai/perstack/commit/eb2f4cc1900bb7ae02bf21c375bdade891d9823e) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add runSettingSchema for validating stored run settings

## 0.0.17

### Patch Changes

- Remove workspace parameter from runtime

  The runtime now executes in the current working directory instead of accepting a workspace parameter. This fixes a sandbox design flaw where the application controlled its own execution boundary.

## 0.0.16

### Patch Changes

- Add health check tool, Zod error formatting, and refactor SkillManager

  Features:

  - Add healthCheck tool to @perstack/base for runtime health monitoring
  - Add friendly Zod error formatting utility to @perstack/core
  - Export BaseEvent interface from @perstack/core

  Improvements:

  - Refactor SkillManager into separate classes (McpSkillManager, InteractiveSkillManager, DelegateSkillManager)
  - Use discriminatedUnion for provider settings in perstack.toml schema
  - Add JSDoc documentation to all core schema types
  - Add Skill Management documentation

## 0.0.15

### Patch Changes

- init

## 0.0.14

### Patch Changes

- init

## 0.0.13

### Patch Changes

- init

## 0.0.12

### Patch Changes

- init

## 0.0.11

### Patch Changes

- init

## 0.0.10

### Patch Changes

- init

## 0.0.9

### Patch Changes

- init

## 0.0.8

### Patch Changes

- add lazy init to skill manager

## 0.0.7

### Patch Changes

- init

## 0.0.6

### Patch Changes

- init

## 0.0.5

### Patch Changes

- Init

## 0.0.4

### Patch Changes

- Init

## 0.0.3

### Patch Changes

- Test: Setting up changeset

## 0.0.2

### Patch Changes

- Test
