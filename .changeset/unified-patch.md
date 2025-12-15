---
"@perstack/api-client": patch
"@perstack/base": patch
"@perstack/claude-code": patch
"@perstack/core": patch
"@perstack/cursor": patch
"@perstack/docker": patch
"@perstack/e2e-mcp-server": patch
"@perstack/gemini": patch
"@perstack/mock": patch
"@perstack/runner": patch
"@perstack/runtime": patch
"@perstack/storage": patch
"@perstack/tui": patch
"create-expert": patch
"perstack": patch
---

Multi-runtime support and Docker enhancements

Features:
- Add Docker runtime adapter with container isolation
- Add multi-runtime support (cursor, claude-code, gemini)
- Add create-expert interactive wizard
- Add @perstack/runner for centralized adapter dispatch
- Add @perstack/storage for modular storage layer
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
