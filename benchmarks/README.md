# Perstack Benchmarks

Performance benchmarks for measuring Perstack runtime efficiency.

## Overview

| Benchmark | Description | Key Metric |
|-----------|-------------|------------|
| [base-transport](#base-transport) | InMemoryTransport vs StdioTransport | Skill init latency |
| [production-perf](#production-perf) | TTFLC and TTFT with lockfile | Time to first LLM call |
| [mcp-startup](#mcp-startup) | MCP skill startup timing analysis | Spawn/handshake breakdown |

## Quick Start

```bash
# Run all benchmarks
npx tsx benchmarks/base-transport/run-benchmark.ts
npx tsx benchmarks/production-perf/run-benchmark.ts
```

---

## base-transport

**Purpose**: Compare initialization latency between bundled base (InMemoryTransport) and versioned base (StdioTransport).

**Run**:
```bash
npx tsx benchmarks/base-transport/run-benchmark.ts
```

### Results (2024-12-22)

| Transport | Spawn | Handshake | Tool Discovery | Total | Status |
|-----------|-------|-----------|----------------|-------|--------|
| InMemory (bundled) | 0ms | 2ms | 2ms | **9ms** | ✓ |
| Stdio (versioned) | 1ms | 1722ms | 3ms | **1726ms** | ✓ |

**Improvement**: 1717ms faster (**99.5% reduction**)

### Analysis

- **InMemoryTransport** skips process spawn entirely, running @perstack/base in-process
- **StdioTransport** requires npx to download and spawn the package (~1.7s overhead)
- Handshake dominates StdioTransport latency (npx download + process spawn)
- Tool discovery is fast in both cases (2-3ms)

---

## production-perf

**Purpose**: Measure production-critical metrics with realistic skill setup:
- **TTFLC** (Time to First LLM Call): `initializeRuntime` → `startGeneration`
- **TTFT** (Time to First Token): `initializeRuntime` → first streaming token

Tests the impact of `perstack install` (lockfile) on startup latency.

**Run**:
```bash
npx tsx benchmarks/production-perf/run-benchmark.ts
```

### Results (2024-12-22)

| Test | TTFLC | TTFT | Total | Base Init | MCP Server Init |
|------|-------|------|-------|-----------|-----------------|
| No lockfile (no reasoning) | 1649ms | - | 6456ms | 9ms | 1633ms |
| No lockfile (minimal reasoning) | 584ms | 2698ms | 6442ms | 10ms | 569ms |
| **With lockfile (no reasoning)** | **7ms** | - | 5068ms | 14ms | deferred |
| **With lockfile (minimal reasoning)** | **7ms** | 2699ms | 4740ms | - | deferred |

### Lockfile Impact

| Metric | Without Lockfile | With Lockfile | Improvement |
|--------|------------------|---------------|-------------|
| TTFLC | 1649ms | 7ms | **99.6% faster** |

### Target Metrics (Epic #234)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| TTFLC (with lockfile) | <100ms | 7ms | ✅ Achieved |
| Base init (InMemoryTransport) | <50ms | 9-14ms | ✅ Achieved |

### Event Sequence Comparison

**Without lockfile** (skills block LLM call):
```
+     0ms  initializeRuntime
+    10ms  skillConnected (@perstack/base)
+    11ms  skillStarting (@perstack/e2e-mcp-server)
+  1645ms  skillConnected (@perstack/e2e-mcp-server)  ← blocks
+  1649ms  startGeneration  ← delayed by skill init
```

**With lockfile** (lazy initialization):
```
+     0ms  initializeRuntime
+     7ms  startGeneration  ← immediate LLM call
+  2790ms  callTools
+  2806ms  skillConnected  ← deferred until needed
```

### Key Insights

1. **Lockfile enables lazy initialization**: Tool definitions are cached, so skill processes aren't spawned until `callTool`
2. **TTFT is API-dependent**: ~2.7s to first token is dominated by LLM API latency, not Perstack overhead
3. **Bundled base is always fast**: InMemoryTransport adds <15ms regardless of lockfile

---

## mcp-startup

**Purpose**: Detailed timing breakdown for MCP skill startup phases (spawn, handshake, tool discovery).

**Usage** (as a filter):
```bash
npx tsx ./apps/runtime/bin/cli.ts run --config benchmarks/mcp-startup/perstack.toml mcp-startup-benchmark "Hello" | npx tsx benchmarks/mcp-startup/filter.ts
```

### Output Format

```
[skillStarting] @perstack/base: npx @perstack/base
[skillConnected] @perstack/base
  spawn:          1ms
  handshake:      1722ms
  toolDiscovery:  3ms
  total:          1726ms

============================================================
TIMING SUMMARY
============================================================
Skill                        Spawn   Handshake  ToolDisc     Total
-------------------------------------------------------------------
@perstack/base                 1ms     1722ms       3ms    1726ms
============================================================
```

**Note**: This benchmark requires `FIRECRAWL_API_KEY` environment variable if testing with the firecrawl skill.

---

## Metrics Glossary

| Metric | Definition | Target |
|--------|------------|--------|
| **TTFLC** | Time from `initializeRuntime` to `startGeneration` | <100ms |
| **TTFT** | Time from `initializeRuntime` to first streaming token | API-dependent |
| **Spawn** | Time to spawn child process | <10ms |
| **Handshake** | MCP protocol initialization (initialize/initialized) | <100ms |
| **Tool Discovery** | Time to call tools/list and parse response | <50ms |
| **Total Init** | Spawn + Handshake + Tool Discovery | <50ms (bundled) |

---

## Environment

Benchmarks run on:
- **Runtime**: local (not Docker)
- **Model**: claude-sonnet-4-5 (Anthropic)
- **Node.js**: v22+
- **Platform**: macOS (darwin 23.4.0)

Results may vary based on:
- Network latency (for npx downloads and API calls)
- CPU/memory availability
- First-run vs cached npx packages
