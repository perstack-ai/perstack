---
"@perstack/core": minor
"@perstack/docker": minor
"@perstack/tui": minor
"@perstack/api-client": minor
"@perstack/base": minor
"@perstack/runtime": minor
"@perstack/storage": minor
"@perstack/runner": minor
"@perstack/mock": minor
"@perstack/cursor": minor
"@perstack/claude-code": minor
"@perstack/gemini": minor
"perstack": minor
"create-expert": minor
---

feat: display Docker progress and proxy status during perstack start

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

Closes #167
