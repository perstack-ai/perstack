---
"perstack": minor
"@perstack/docker": minor
"@perstack/runner": patch
"@perstack/core": patch
---

Add --workspace option for Docker runtime volume mounting

Enable users to mount host directories in Docker containers when using --runtime docker. This allows running Experts in isolated Docker containers while accessing local codebases.
