---
"@perstack/core": patch
"@perstack/runtime": patch
"@perstack/claude-code": patch
"@perstack/cursor": patch
"@perstack/gemini": patch
"@perstack/filesystem-storage": patch
"@perstack/s3-compatible-storage": patch
"perstack": patch
---

Add required action field to Checkpoint for UI display

- Added `CheckpointActionInit` type for initial checkpoints
- `Checkpoint.action` is now required
- All checkpoint creation sites include action field
- Runtime computes action during checkpoint creation
