#!/usr/bin/env npx tsx
import { runTestSuite } from "./lib/runner.js"
import { continueResumeSuite } from "./scenarios/continue-resume.js"
import { delegateChainSuite } from "./scenarios/delegate-chain.js"
import { mixedToolsSuite } from "./scenarios/mixed-tools.js"
import { parallelMcpSuite } from "./scenarios/parallel-mcp.js"

async function main() {
  const args = process.argv.slice(2)
  const suiteFilter = args[0]
  const suites = [mixedToolsSuite, parallelMcpSuite, delegateChainSuite, continueResumeSuite]
  const filteredSuites = suiteFilter
    ? suites.filter((s) => s.name.toLowerCase().includes(suiteFilter.toLowerCase()))
    : suites
  if (filteredSuites.length === 0) {
    console.error(`No suites matching "${suiteFilter}"`)
    console.log("Available suites:")
    for (const suite of suites) {
      console.log(`  - ${suite.name}`)
    }
    process.exit(1)
  }
  console.log("\n🧪 Perstack E2E Tests\n")
  let totalPassed = 0
  let totalFailed = 0
  for (const suite of filteredSuites) {
    const result = await runTestSuite(suite)
    totalPassed += result.passed
    totalFailed += result.failed
  }
  console.log("\n" + "═".repeat(60))
  console.log(`📊 Total: ${totalPassed} passed, ${totalFailed} failed`)
  console.log("═".repeat(60) + "\n")
  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("E2E test runner error:", err)
  process.exit(1)
})

