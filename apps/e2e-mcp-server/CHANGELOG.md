# @perstack/e2e-mcp-server

## 0.0.4

### Patch Changes

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

### Patch Changes

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
