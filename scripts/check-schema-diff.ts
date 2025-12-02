import { execSync } from "node:child_process"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { exit } from "node:process"

const CORE_SCHEMAS_DIR = "packages/core/src/schemas"
const CHANGESET_DIR = ".changeset"
async function getChangedSchemaFiles(): Promise<string[]> {
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || "main"
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, { encoding: "utf-8" })
    const changedFiles = diff.split("\n").filter(Boolean)
    return changedFiles.filter((file) => file.startsWith(CORE_SCHEMAS_DIR) && file.endsWith(".ts"))
  } catch {
    return []
  }
}
async function getChangesets(): Promise<string[]> {
  try {
    const files = await readdir(CHANGESET_DIR)
    return files.filter((file) => file.endsWith(".md") && file !== "README.md")
  } catch {
    return []
  }
}
async function parseChangeset(filename: string): Promise<{
  packages: Array<{ name: string; type: "major" | "minor" | "patch" }>
}> {
  const content = await readFile(join(CHANGESET_DIR, filename), "utf-8")
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return { packages: [] }
  }
  const frontmatter = frontmatterMatch[1]
  const packages: Array<{ name: string; type: "major" | "minor" | "patch" }> = []
  const lines = frontmatter.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('"') && line.includes('":')) {
      const match = line.match(/"([^"]+)":\s*(major|minor|patch)/)
      if (match) {
        packages.push({ name: match[1], type: match[2] as "major" | "minor" | "patch" })
      }
    }
  }
  return { packages }
}
async function check() {
  const changedSchemas = await getChangedSchemaFiles()
  if (changedSchemas.length === 0) {
    console.log("No schema files changed. Skipping check.")
    return
  }
  console.log(`\nDetected schema changes:`)
  for (const file of changedSchemas) {
    console.log(`  - ${file}`)
  }
  const changesetFiles = await getChangesets()
  if (changesetFiles.length === 0) {
    console.log("\n❌ Schema files changed but no changeset found!")
    console.log("Run: pnpm changeset")
    console.log("Schema changes require at least a minor version bump.")
    exit(1)
  }
  let hasCoreMinorOrMajor = false
  for (const file of changesetFiles) {
    const { packages } = await parseChangeset(file)
    const coreChange = packages.find((pkg) => pkg.name === "@perstack/core")
    if (coreChange && (coreChange.type === "major" || coreChange.type === "minor")) {
      hasCoreMinorOrMajor = true
      break
    }
  }
  if (!hasCoreMinorOrMajor) {
    console.log("\n⚠️  Warning: Schema files changed but core has no major/minor bump")
    console.log("Schema changes typically require at least a minor version bump.")
    console.log("If this is intentional (e.g., documentation only), you can ignore this warning.")
  } else {
    console.log("\n✅ Schema change with appropriate version bump detected")
  }
}
check().catch((error) => {
  console.error("Error during check:", error)
  exit(1)
})
