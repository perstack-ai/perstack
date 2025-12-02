# E2E Testing Guide

Manual E2E testing procedures for perstack CLI.

## Prerequisites

```bash
pnpm build
```

## Test Commands

Use `npx tsx` or `bun` to run the CLI:

```bash
CLI="npx tsx packages/perstack/dist/bin/cli.js"
```

### 1. Help and Version

```bash
$CLI --help
$CLI --version
$CLI run --help
$CLI publish --help
$CLI unpublish --help
$CLI tag --help
$CLI status --help
```

**Expected**: All commands display help/version without errors.

### 2. Publish Dry Run

```bash
# Valid expert
$CLI publish tic-tac-toe --dry-run

# Invalid expert
$CLI publish nonexistent --dry-run
```

**Expected**:
- Valid: Outputs JSON payload
- Invalid: Error message with available experts, exit code 1

### 3. Argument Validation

```bash
# Missing required args
$CLI run
$CLI run expertOnly

# Invalid format (missing version)
$CLI unpublish no-version --force
$CLI tag no-version tag1
$CLI status no-version available

# Invalid status value
$CLI status expert@1.0.0 invalid-status

# Missing tags
$CLI tag expert@1.0.0
```

**Expected**: All return appropriate error messages with exit code 1.

### 4. Config File Handling

```bash
# Nonexistent config
$CLI publish tic-tac-toe --dry-run --config nonexistent.toml

# No config in directory
cd /tmp && $CLI publish tic-tac-toe --dry-run
```

**Expected**: Error message indicating config file not found, exit code 1.

### 5. Run Command Error Handling

```bash
# Nonexistent expert
$CLI run nonexistent-expert "test query"
```

**Expected**: Error message with exit code 1.

## Quick Test Script

```bash
#!/bin/bash
set -e
CLI="npx tsx packages/perstack/dist/bin/cli.js"

echo "=== Help Commands ==="
$CLI --help > /dev/null && echo "OK: --help"
$CLI --version > /dev/null && echo "OK: --version"

echo "=== Publish Dry Run ==="
$CLI publish tic-tac-toe --dry-run > /dev/null && echo "OK: publish dry-run"
$CLI publish nonexistent --dry-run 2>&1 && exit 1 || echo "OK: publish invalid expert"

echo "=== Argument Validation ==="
$CLI run 2>&1 && exit 1 || echo "OK: run missing args"
$CLI unpublish no-version --force 2>&1 && exit 1 || echo "OK: unpublish invalid format"
$CLI status expert@1.0.0 invalid-status 2>&1 && exit 1 || echo "OK: status invalid value"

echo "=== Config Handling ==="
$CLI publish tic-tac-toe --dry-run --config nonexistent.toml 2>&1 && exit 1 || echo "OK: nonexistent config"

echo "All tests passed!"
```
