---
"@perstack/core": patch
"@perstack/runtime": patch
"@perstack/api-client": patch
"@perstack/tui": patch
"perstack": patch
---

Add Job concept as parent container for Runs

- Add Job schema and jobId to Checkpoint, RunSetting, and Event types
- Update storage structure to perstack/jobs/{jobId}/runs/{runId}/
- Update CLI options: --job-id, --continue-job (replacing --continue-run)
