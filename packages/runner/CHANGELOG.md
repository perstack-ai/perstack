# @perstack/runner

## 0.0.4

### Patch Changes

- Updated dependencies [[`dacb0eb`](https://github.com/perstack-ai/perstack/commit/dacb0eb3718a2cce918a6ab455ffb9ef6cce99c9)]:
  - @perstack/runtime@0.0.72

## 0.0.3

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

- Updated dependencies [[`d6b7d4d`](https://github.com/perstack-ai/perstack/commit/d6b7d4d34fa9f92c57d324884e4fa6603ec577a1), [`90b86c0`](https://github.com/perstack-ai/perstack/commit/90b86c0e503dac95a3d6bc1a29a6f5d8d35dd666), [`7792a8d`](https://github.com/perstack-ai/perstack/commit/7792a8df1aa988ae04c40f4ee737e5086b9cacca), [`edec35e`](https://github.com/perstack-ai/perstack/commit/edec35e728c89ef98873cee9594ecc3a853d3999), [`5b07fd7`](https://github.com/perstack-ai/perstack/commit/5b07fd7ba21fae211ab38e808881c9bdc80de718), [`80a58ed`](https://github.com/perstack-ai/perstack/commit/80a58edf047bc0ef883745afd52173dfc4162669), [`7c4054f`](https://github.com/perstack-ai/perstack/commit/7c4054f949bec01aec854b32cd1513d913038079), [`f5dc244`](https://github.com/perstack-ai/perstack/commit/f5dc244339238f080661c6e73f652cd737d3c218), [`98e8614`](https://github.com/perstack-ai/perstack/commit/98e86141ea516949f881951aed654b43aeff1793), [`a01ee65`](https://github.com/perstack-ai/perstack/commit/a01ee65fa1932726928744bb625c3196b499a20b), [`0653050`](https://github.com/perstack-ai/perstack/commit/065305088dce72c2cf68873a1485c98183174c78), [`26e1109`](https://github.com/perstack-ai/perstack/commit/26e11097a65c1b2cc9aa74f48b53026df3eaa4b0), [`beb1edc`](https://github.com/perstack-ai/perstack/commit/beb1edc7222231ac67cf0653331e4644b162ca8b), [`58ddc86`](https://github.com/perstack-ai/perstack/commit/58ddc8690ff6a399a270c487e8035065efa03fb5), [`d88f116`](https://github.com/perstack-ai/perstack/commit/d88f116edbbb8ffa4240066f0bacb70f442e1123), [`f92dde5`](https://github.com/perstack-ai/perstack/commit/f92dde5c85798bcea2bfc833c540831caaff6658), [`20ea0a5`](https://github.com/perstack-ai/perstack/commit/20ea0a5ecf9c08a2362430144d0454f0e996ac62), [`9da758b`](https://github.com/perstack-ai/perstack/commit/9da758b3b59047a7086d5748dbaa586bbd9dbca1), [`90f7de0`](https://github.com/perstack-ai/perstack/commit/90f7de06a92f98df771a71cc663da607f11d8194), [`0831c63`](https://github.com/perstack-ai/perstack/commit/0831c63c1484dd9b0a6c6ce95504d46c05086aa4), [`51159b6`](https://github.com/perstack-ai/perstack/commit/51159b6e9fabed47134cbb94f1145e950928bca0)]:
  - @perstack/runtime@0.1.0
  - @perstack/core@0.1.0
  - @perstack/filesystem-storage@0.1.0
  - @perstack/docker@0.1.0
  - @perstack/cursor@0.1.0
  - @perstack/claude-code@0.1.0
  - @perstack/gemini@0.1.0
