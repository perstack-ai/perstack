import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { exit } from "node:process"

const CHANGESET_DIR = ".changeset"
const CORE_PACKAGE = "@perstack/core"
const DOCS_PACKAGE = "@perstack/docs"
async function getChangesets(): Promise<string[]> {
  const files = await readdir(CHANGESET_DIR)
  return files.filter((file) => file.endsWith(".md") && file !== "README.md")
}
async function parseChangeset(filename: string): Promise<{
  packages: Array<{ name: string; type: "major" | "minor" | "patch" }>
  content: string
}> {
  const content = await readFile(join(CHANGESET_DIR, filename), "utf-8")
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return { packages: [], content }
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
  return { packages, content }
}
async function getAllPackages(): Promise<string[]> {
  const packagesDir = "packages"
  const dirs = await readdir(packagesDir, { withFileTypes: true })
  const packages: string[] = []
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      try {
        const pkgJsonPath = join(packagesDir, dir.name, "package.json")
        const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"))
        if (pkgJson.name && pkgJson.name !== DOCS_PACKAGE) {
          packages.push(pkgJson.name)
        }
      } catch {}
    }
  }
  return packages
}
async function validate() {
  const changesetFiles = await getChangesets()
  if (changesetFiles.length === 0) {
    console.log("No changesets found. Skipping validation.")
    return
  }
  const allPackages = await getAllPackages()
  const errors: string[] = []
  const warnings: string[] = []
  for (const file of changesetFiles) {
    const { packages } = await parseChangeset(file)
    if (packages.length === 0) {
      warnings.push(`Changeset ${file} has no packages`)
      continue
    }
    const coreChange = packages.find((pkg) => pkg.name === CORE_PACKAGE)
    const otherChanges = packages.filter((pkg) => pkg.name !== CORE_PACKAGE)
    if (coreChange && (coreChange.type === "major" || coreChange.type === "minor")) {
      const missingPackages = allPackages.filter(
        (pkg) => pkg !== CORE_PACKAGE && !packages.find((p) => p.name === pkg),
      )
      if (missingPackages.length > 0) {
        errors.push(
          `Changeset ${file}: Core has ${coreChange.type} bump, but missing packages: ${missingPackages.join(", ")}`,
        )
      }
      const wrongTypePackages = otherChanges.filter((pkg) => pkg.type !== coreChange.type)
      if (wrongTypePackages.length > 0) {
        errors.push(
          `Changeset ${file}: All packages must have ${coreChange.type} bump when core does, but found: ${wrongTypePackages.map((p) => `${p.name}:${p.type}`).join(", ")}`,
        )
      }
    }
    if (!coreChange && otherChanges.some((pkg) => pkg.type === "major" || pkg.type === "minor")) {
      const majorMinorPackages = otherChanges.filter(
        (pkg) => pkg.type === "major" || pkg.type === "minor",
      )
      errors.push(
        `Changeset ${file}: Packages have major/minor bump but core is not included: ${majorMinorPackages.map((p) => `${p.name}:${p.type}`).join(", ")}`,
      )
    }
  }
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:")
    for (const warning of warnings) {
      console.log(`  - ${warning}`)
    }
  }
  if (errors.length > 0) {
    console.log("\n❌ Validation failed:")
    for (const error of errors) {
      console.log(`  - ${error}`)
    }
    console.log("\nChangeset validation rules:")
    console.log("  1. Core major/minor bump requires ALL packages to bump with same type")
    console.log("  2. Any package major/minor bump requires core to bump with same type")
    console.log("  3. Patch bumps can be independent")
    exit(1)
  }
  console.log("✅ Changeset validation passed")
}
validate().catch((error) => {
  console.error("Error during validation:", error)
  exit(1)
})
