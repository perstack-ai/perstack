---
"@perstack/api-client": patch
"@perstack/runtime": patch
"perstack": patch
---

Rewrote @perstack/api-client with modern patterns

- Replaced class-based `ApiV1Client` with functional `createApiClient()`
- Introduced Result pattern for error handling (no exceptions for HTTP errors)
- Added namespace-style API access (e.g., `client.registry.experts.get()`)
- Simplified test utilities by removing unused OpenAPI spec-based mock generation
- Migrated all consumers to use the new API
