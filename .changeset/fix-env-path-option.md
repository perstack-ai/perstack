---
"perstack": patch
"@perstack/runtime": patch
"@perstack/core": patch
---

fix: change --env-path from variadic to repeatable option to fix argument parsing issue

The `--env-path <envPath...>` variadic option was consuming positional arguments when placed before them. Changed to a repeatable option pattern (`--env-path <path>`) that can be specified multiple times. This fixes E2E test failure for the `--env-path` option.
