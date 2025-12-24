# @perstack/runtime

## 0.0.73

### Patch Changes

- Internal improvements and maintenance updates

- Updated dependencies []:
  - @perstack/base@0.0.37
  - @perstack/core@0.0.29
  - @perstack/api-client@0.0.37

## 0.0.72

### Patch Changes

- [#256](https://github.com/perstack-ai/perstack/pull/256) [`dacb0eb`](https://github.com/perstack-ai/perstack/commit/dacb0eb3718a2cce918a6ab455ffb9ef6cce99c9) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Rewrote @perstack/api-client with modern patterns

  - Replaced class-based `ApiV1Client` with functional `createApiClient()`
  - Introduced Result pattern for error handling (no exceptions for HTTP errors)
  - Added namespace-style API access (e.g., `client.registry.experts.get()`)
  - Simplified test utilities by removing unused OpenAPI spec-based mock generation
  - Migrated all consumers to use the new API

- [#265](https://github.com/perstack-ai/perstack/pull/265) [`8555f5b`](https://github.com/perstack-ai/perstack/commit/8555f5b842e6bb26f667e52b5ce383e6a6c7317e) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Internal improvements and maintenance updates

- Updated dependencies [[`dacb0eb`](https://github.com/perstack-ai/perstack/commit/dacb0eb3718a2cce918a6ab455ffb9ef6cce99c9), [`8555f5b`](https://github.com/perstack-ai/perstack/commit/8555f5b842e6bb26f667e52b5ce383e6a6c7317e)]:
  - @perstack/api-client@0.0.36
  - @perstack/base@0.0.36
  - @perstack/core@0.0.28

## 0.0.71

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

- [#246](https://github.com/perstack-ai/perstack/pull/246) [`7c4054f`](https://github.com/perstack-ai/perstack/commit/7c4054f949bec01aec854b32cd1513d913038079) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fixed delegation chain failure when LLM returns empty text response

  Some models (like Gemini) may return tool calls without accompanying text. This caused delegation to fail with "delegation result message does not contain a text" error. Now empty text is handled gracefully by using an empty string as fallback.

- [#155](https://github.com/perstack-ai/perstack/pull/155) [`f5dc244`](https://github.com/perstack-ai/perstack/commit/f5dc244339238f080661c6e73f652cd737d3c218) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - fix: change --env-path from variadic to repeatable option to fix argument parsing issue

  The `--env-path <envPath...>` variadic option was consuming positional arguments when placed before them. Changed to a repeatable option pattern (`--env-path <path>`) that can be specified multiple times. This fixes E2E test failure for the `--env-path` option.

- [#242](https://github.com/perstack-ai/perstack/pull/242) [`98e8614`](https://github.com/perstack-ai/perstack/commit/98e86141ea516949f881951aed654b43aeff1793) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix runtime CLI to automatically load lockfile for deferred skill initialization

- [#200](https://github.com/perstack-ai/perstack/pull/200) [`f92dde5`](https://github.com/perstack-ai/perstack/commit/f92dde5c85798bcea2bfc833c540831caaff6658) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Refactored packages/runtime with clean architecture patterns following packages/docker design:

  - Introduced `tool-execution/` module with Strategy pattern for tool execution

    - `ToolExecutor` interface and `McpToolExecutor` implementation
    - `ToolExecutorFactory` for creating executors
    - `tool-classifier.ts` to eliminate duplicate `getToolType` functions
    - Comprehensive unit tests (~94% coverage)

  - Introduced `orchestration/` module with proper separation of concerns

    - `StepExecutor` class for single state machine execution (no recursion)
    - `DelegationStrategy` interface with `SingleDelegationStrategy` and `ParallelDelegationStrategy`
    - Clear boundary: `run.ts` owns the loop, `StepExecutor` handles single step
    - Comprehensive unit tests (~94% coverage)

  - Simplified `run.ts` to own the run loop and delegation routing
  - Reduced `calling-tool.ts` complexity by extracting tool execution logic
  - Eliminated code duplication between `calling-tool.ts` and `calling-delegate.ts`

- [#206](https://github.com/perstack-ai/perstack/pull/206) [`20ea0a5`](https://github.com/perstack-ai/perstack/commit/20ea0a5ecf9c08a2362430144d0454f0e996ac62) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Improve testability with pure functions, factories, and StateMachineCoordinator

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

- Updated dependencies [[`d6b7d4d`](https://github.com/perstack-ai/perstack/commit/d6b7d4d34fa9f92c57d324884e4fa6603ec577a1), [`90b86c0`](https://github.com/perstack-ai/perstack/commit/90b86c0e503dac95a3d6bc1a29a6f5d8d35dd666), [`7792a8d`](https://github.com/perstack-ai/perstack/commit/7792a8df1aa988ae04c40f4ee737e5086b9cacca), [`edec35e`](https://github.com/perstack-ai/perstack/commit/edec35e728c89ef98873cee9594ecc3a853d3999), [`5b07fd7`](https://github.com/perstack-ai/perstack/commit/5b07fd7ba21fae211ab38e808881c9bdc80de718), [`80a58ed`](https://github.com/perstack-ai/perstack/commit/80a58edf047bc0ef883745afd52173dfc4162669), [`f5dc244`](https://github.com/perstack-ai/perstack/commit/f5dc244339238f080661c6e73f652cd737d3c218), [`a01ee65`](https://github.com/perstack-ai/perstack/commit/a01ee65fa1932726928744bb625c3196b499a20b), [`0653050`](https://github.com/perstack-ai/perstack/commit/065305088dce72c2cf68873a1485c98183174c78), [`26e1109`](https://github.com/perstack-ai/perstack/commit/26e11097a65c1b2cc9aa74f48b53026df3eaa4b0), [`beb1edc`](https://github.com/perstack-ai/perstack/commit/beb1edc7222231ac67cf0653331e4644b162ca8b), [`58ddc86`](https://github.com/perstack-ai/perstack/commit/58ddc8690ff6a399a270c487e8035065efa03fb5), [`d88f116`](https://github.com/perstack-ai/perstack/commit/d88f116edbbb8ffa4240066f0bacb70f442e1123), [`9da758b`](https://github.com/perstack-ai/perstack/commit/9da758b3b59047a7086d5748dbaa586bbd9dbca1), [`90f7de0`](https://github.com/perstack-ai/perstack/commit/90f7de06a92f98df771a71cc663da607f11d8194), [`0831c63`](https://github.com/perstack-ai/perstack/commit/0831c63c1484dd9b0a6c6ce95504d46c05086aa4), [`51159b6`](https://github.com/perstack-ai/perstack/commit/51159b6e9fabed47134cbb94f1145e950928bca0)]:
  - @perstack/core@0.1.0
  - @perstack/api-client@0.1.0
  - @perstack/base@0.1.0
  - @perstack/anthropic-provider@0.1.0
  - @perstack/openai-provider@0.1.0
  - @perstack/google-provider@0.1.0
  - @perstack/ollama-provider@0.1.0
  - @perstack/azure-openai-provider@0.1.0
  - @perstack/bedrock-provider@0.1.0
  - @perstack/vertex-provider@0.1.0
  - @perstack/deepseek-provider@0.1.0
  - @perstack/provider-core@0.1.0

## 0.0.63

### Patch Changes

- [#78](https://github.com/perstack-ai/perstack/pull/78) [`654ea63`](https://github.com/perstack-ai/perstack/commit/654ea635245f77baa43020dcab75efe31ab42cf4) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add Job concept as parent container for Runs

  - Add Job schema and jobId to Checkpoint, RunSetting, and Event types
  - Update storage structure to perstack/jobs/{jobId}/runs/{runId}/
  - Update CLI options: --job-id, --continue-job (replacing --continue-run)

- Updated dependencies [[`654ea63`](https://github.com/perstack-ai/perstack/commit/654ea635245f77baa43020dcab75efe31ab42cf4)]:
  - @perstack/core@0.0.22
  - @perstack/api-client@0.0.33

## 0.0.62

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

- Updated dependencies [[`3b64f88`](https://github.com/perstack-ai/perstack/commit/3b64f886b2e6f030d0e75d0baf4b51fb4d3747b8)]:
  - @perstack/core@0.0.21
  - @perstack/api-client@0.0.32

## 0.0.61

### Patch Changes

- [#51](https://github.com/perstack-ai/perstack/pull/51) [`5497b47`](https://github.com/perstack-ai/perstack/commit/5497b478476ef95688a9cb28cfaf20473e6ae3ce) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add skill lifecycle events for MCP startup debugging

  - Add `skillStarting` event with command and args
  - Add `skillStderr` event for child process stderr output
  - Add `connectDurationMs` and `totalDurationMs` to `skillConnected` event

- Updated dependencies [[`5497b47`](https://github.com/perstack-ai/perstack/commit/5497b478476ef95688a9cb28cfaf20473e6ae3ce)]:
  - @perstack/core@0.0.20
  - @perstack/api-client@0.0.31

## 0.0.60

### Patch Changes

- [#45](https://github.com/perstack-ai/perstack/pull/45) [`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add event detail view in history browser

  Users can now select an event in the events list to view its details including type, step number, timestamp, and IDs.

- [#50](https://github.com/perstack-ai/perstack/pull/50) [`b19e6f1`](https://github.com/perstack-ai/perstack/commit/b19e6f1b943226f2da8c0bb6121375498697672b) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add debug logging for MCP skill startup time

- Updated dependencies [[`af20acb`](https://github.com/perstack-ai/perstack/commit/af20acb717b74df1d59164858e3848d6da48a21a)]:
  - @perstack/core@0.0.19
  - @perstack/api-client@0.0.30

## 0.0.59

### Patch Changes

- [#17](https://github.com/perstack-ai/perstack/pull/17) [`4948a7b`](https://github.com/perstack-ai/perstack/commit/4948a7ba2d44bbc6d40df1a3b83bbf73f3834285) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add exhaustive default case to getModel switch statement

## 0.0.58

### Patch Changes

- [#18](https://github.com/perstack-ai/perstack/pull/18) [`06bceed`](https://github.com/perstack-ai/perstack/commit/06bceedcedf9f69222d5a64fb5b9299c02ae389b) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Continue emitting events when listener throws

- [#19](https://github.com/perstack-ai/perstack/pull/19) [`c7ae375`](https://github.com/perstack-ai/perstack/commit/c7ae3755db0d53a365a17aadfdce132ad64a15e9) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Use startedAt for instruction message timestamp

## 0.0.57

### Patch Changes

- [#14](https://github.com/perstack-ai/perstack/pull/14) [`eb2f4cc`](https://github.com/perstack-ai/perstack/commit/eb2f4cc1900bb7ae02bf21c375bdade891d9823e) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add runSettingSchema for validating stored run settings

- Updated dependencies [[`eb2f4cc`](https://github.com/perstack-ai/perstack/commit/eb2f4cc1900bb7ae02bf21c375bdade891d9823e)]:
  - @perstack/core@0.0.18
  - @perstack/api-client@0.0.29

## 0.0.56

### Patch Changes

- [#12](https://github.com/perstack-ai/perstack/pull/12) [`50c1640`](https://github.com/perstack-ai/perstack/commit/50c16404b3e34b7fb40a03a3edeb9b9da2d09844) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Avoid object mutation in getSkillManagers and resolveExpertToRun

## 0.0.55

### Patch Changes

- [#11](https://github.com/perstack-ai/perstack/pull/11) [`a6ab2b8`](https://github.com/perstack-ai/perstack/commit/a6ab2b8b246d60e2b366901d7b441febec2e258f) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Clean up initialized skill managers when delegate expert is not found

- [#9](https://github.com/perstack-ai/perstack/pull/9) [`cd5dbb1`](https://github.com/perstack-ai/perstack/commit/cd5dbb1a46372a6772ec78ff24292a541fc0d081) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add explicit error message when delegate expert is not found

## 0.0.54

### Patch Changes

- [#7](https://github.com/perstack-ai/perstack/pull/7) [`84a5692`](https://github.com/perstack-ai/perstack/commit/84a5692c7ba906962ff24c28074822e9eedda60a) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Handle file read errors gracefully in resolving PDF and image file states

## 0.0.53

### Patch Changes

- [#5](https://github.com/perstack-ai/perstack/pull/5) [`d683ae0`](https://github.com/perstack-ai/perstack/commit/d683ae09284e95a1a5b12701bd2ae466e3b620bd) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix closeSkillManagers to continue closing other managers when one fails

## 0.0.52

### Patch Changes

- [#3](https://github.com/perstack-ai/perstack/pull/3) [`b5c7cf3`](https://github.com/perstack-ai/perstack/commit/b5c7cf3f0314cc7a181606a9497fe077b4e7aecc) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Fix maxSteps off-by-one error that caused one extra step to execute

## 0.0.51

### Patch Changes

- [#1](https://github.com/perstack-ai/perstack/pull/1) [`0719f70`](https://github.com/perstack-ai/perstack/commit/0719f702a751dc4cc8cc7de4a9287ba81e8db4d2) Thanks [@FL4TLiN3](https://github.com/FL4TLiN3)! - Add related documentation links to README

## 0.0.50

### Patch Changes

- Remove workspace parameter from runtime

  The runtime now executes in the current working directory instead of accepting a workspace parameter. This fixes a sandbox design flaw where the application controlled its own execution boundary.

- Updated dependencies
  - @perstack/core@0.0.17
  - @perstack/api-client@0.0.28

## 0.0.49

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

- Updated dependencies
  - @perstack/api-client@0.0.27
  - @perstack/core@0.0.16

## 0.0.48

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.26
  - @perstack/core@0.0.15

## 0.0.47

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.25
  - @perstack/core@0.0.14

## 0.0.46

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.24
  - @perstack/core@0.0.13

## 0.0.45

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.23
  - @perstack/core@0.0.12

## 0.0.44

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.22
  - @perstack/core@0.0.11

## 0.0.43

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.21
  - @perstack/core@0.0.10

## 0.0.42

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.20
  - @perstack/core@0.0.9

## 0.0.41

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.19

## 0.0.40

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.18

## 0.0.39

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @perstack/api-client@0.0.17

## 0.0.38

### Patch Changes

- add lazy init to skill manager
- Updated dependencies
  - @perstack/core@0.0.8
  - @perstack/api-client@0.0.15

## 0.0.37

### Patch Changes

- init
- Updated dependencies
  - @perstack/core@0.0.7
  - @perstack/api-client@0.0.14

## 0.0.36

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.13
  - @perstack/core@0.0.6

## 0.0.35

### Patch Changes

- init
- Updated dependencies
  - @perstack/api-client@0.0.12

## 0.0.34

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.11

## 0.0.33

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.10

## 0.0.32

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.9

## 0.0.31

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.8

## 0.0.30

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.7

## 0.0.29

### Patch Changes

- Updated dependencies
  - @perstack/api-client@0.0.6

## 0.0.28

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.5
  - @perstack/core@0.0.5

## 0.0.27

### Patch Changes

- Init
- Updated dependencies
  - @perstack/api-client@0.0.4
  - @perstack/core@0.0.4

## 0.0.26

### Patch Changes

- Test: Setting up changeset
- Updated dependencies
  - @perstack/api-client@0.0.3
  - @perstack/core@0.0.3

## 0.0.25

### Patch Changes

- Test
- Updated dependencies
  - @perstack/api-client@0.0.2
  - @perstack/core@0.0.2
