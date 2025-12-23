/**
 * Adds frontmatter to markdown files that don't have it.
 *
 * Usage:
 *   npx tsx scripts/add-frontmatter.ts
 *   npx tsx scripts/add-frontmatter.ts --dry-run
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

const DOCS_DIR = "docs"

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "references" && fullPath.includes("api")) {
        continue
      }
      files.push(...(await findMarkdownFiles(fullPath)))
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath)
    }
  }

  return files
}

function hasFrontmatter(content: string): boolean {
  return content.startsWith("---\n")
}

function extractTitleFromContent(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function addFrontmatter(content: string, title: string): string {
  const frontmatter = `---\ntitle: "${title}"\n---\n\n`
  return frontmatter + content
}

async function processFile(
  filePath: string,
  dryRun: boolean,
): Promise<{ path: string; status: "added" | "skipped" | "no-title" }> {
  const content = await fs.readFile(filePath, "utf-8")

  if (hasFrontmatter(content)) {
    return { path: filePath, status: "skipped" }
  }

  const title = extractTitleFromContent(content)
  if (!title) {
    return { path: filePath, status: "no-title" }
  }

  if (!dryRun) {
    const newContent = addFrontmatter(content, title)
    await fs.writeFile(filePath, newContent, "utf-8")
  }

  return { path: filePath, status: "added" }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  if (dryRun) {
    console.log("Dry run mode - no files will be modified\n")
  }

  const files = await findMarkdownFiles(DOCS_DIR)
  console.log(`Found ${files.length} markdown files\n`)

  const results = await Promise.all(files.map((file) => processFile(file, dryRun)))

  const added = results.filter((r) => r.status === "added")
  const skipped = results.filter((r) => r.status === "skipped")
  const noTitle = results.filter((r) => r.status === "no-title")

  if (added.length > 0) {
    console.log(`${dryRun ? "Would add" : "Added"} frontmatter to ${added.length} files:`)
    for (const r of added) {
      console.log(`  ${r.path}`)
    }
    console.log("")
  }

  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} files (already have frontmatter)`)
  }

  if (noTitle.length > 0) {
    console.log(`\nWarning: ${noTitle.length} files have no title:`)
    for (const r of noTitle) {
      console.log(`  ${r.path}`)
    }
  }
}

main()
