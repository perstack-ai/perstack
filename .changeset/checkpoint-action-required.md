---
"@perstack/core": major
"@perstack/runtime": major
"@perstack/claude-code": major
"@perstack/cursor": major
"@perstack/gemini": major
"@perstack/filesystem-storage": major
"@perstack/s3-compatible-storage": major
"perstack": major
---

BREAKING: Make action field required in Checkpoint interface

- Added `CheckpointActionInit` type for initial checkpoints
- `Checkpoint.action` is now required (was optional)
- All checkpoint creation sites include action field
- Runtime computes action during checkpoint creation

Migration: Checkpoints without action field are no longer valid. Ensure all checkpoint creation includes the action field.
