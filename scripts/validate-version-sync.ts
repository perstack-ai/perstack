import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { exit } from "node:process"

const PACKAGES_DIR = "packages"
const CORE_PACKAGE = "@perstack/core"
const DOCS_PACKAGE = "@perstack/docs"
interface PackageInfo {
  name: string
  version: string
  dependencies: Record<string, string>
  path: string
}
async function getPackageInfo(dirName: string): Promise<PackageInfo | null> {
  try {
    const pkgJsonPath = join(PACKAGES_DIR, dirName, "package.json")
    const content = await readFile(pkgJsonPath, "utf-8")
    const pkgJson = JSON.parse(content)
    if (!pkgJson.name || pkgJson.name === DOCS_PACKAGE) {
      return null
    }
    return {
      name: pkgJson.name,
      version: pkgJson.version,
      dependencies: pkgJson.dependencies || {},
      path: pkgJsonPath,
    }
  } catch {
    return null
  }
}
async function getAllPackages(): Promise<PackageInfo[]> {
  const dirs = await readdir(PACKAGES_DIR, { withFileTypes: true })
  const packages: PackageInfo[] = []
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const info = await getPackageInfo(dir.name)
      if (info) {
        packages.push(info)
      }
    }
  }
  return packages
}
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}
async function validate() {
  const packages = await getAllPackages()
  const corePackage = packages.find((pkg) => pkg.name === CORE_PACKAGE)
  if (!corePackage) {
    console.log("Core package not found. Skipping validation.")
    return
  }
  const coreVersion = parseVersion(corePackage.version)
  if (!coreVersion) {
    console.log(`Invalid core version: ${corePackage.version}`)
    exit(1)
  }
  console.log(`\nCore version: ${corePackage.version}`)
  const errors: string[] = []
  const warnings: string[] = []
  for (const pkg of packages) {
    if (pkg.name === CORE_PACKAGE) continue
    const coreDep = pkg.dependencies[CORE_PACKAGE]
    if (!coreDep) continue
    if (coreDep === "workspace:*") {
      const pkgVersion = parseVersion(pkg.version)
      if (!pkgVersion) {
        warnings.push(`${pkg.name}: Invalid version ${pkg.version}`)
        continue
      }
      if (pkgVersion.major !== coreVersion.major || pkgVersion.minor !== coreVersion.minor) {
        errors.push(
          `${pkg.name}: Version mismatch - package is ${pkg.version} but core is ${corePackage.version}`,
        )
      }
    } else {
      warnings.push(`${pkg.name}: Not using workspace:* for core dependency (${coreDep})`)
    }
  }
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:")
    for (const warning of warnings) {
      console.log(`  - ${warning}`)
    }
  }
  if (errors.length > 0) {
    console.log("\n❌ Version sync validation failed:")
    for (const error of errors) {
      console.log(`  - ${error}`)
    }
    console.log("\nVersion sync rules:")
    console.log("  - All packages must have the same major.minor version as core")
    console.log("  - Patch versions can differ (implementation quality)")
    console.log(`\nExpected: All packages should be X.Y.* where core is ${corePackage.version}`)
    exit(1)
  }
  console.log("\n✅ Version sync validation passed")
  console.log("All packages are aligned with core's major.minor version")
}
validate().catch((error) => {
  console.error("Error during validation:", error)
  exit(1)
})
