import { realpathSync } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export const workspacePath = realpathSync(expandHome(process.cwd()))

function expandHome(filepath: string): string {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(1))
  }
  return filepath
}

export async function validatePath(requestedPath: string): Promise<string> {
  const expandedPath = expandHome(requestedPath)
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath)
  const perstackDir = `${workspacePath}/perstack`.toLowerCase()
  if (
    absolute.toLowerCase() === perstackDir ||
    absolute.toLowerCase().startsWith(`${perstackDir}/`)
  ) {
    throw new Error("Access denied - perstack directory is not allowed")
  }
  try {
    const realAbsolute = await fs.realpath(absolute)
    if (!isWithinWorkspace(realAbsolute)) {
      throw new Error("Access denied - symlink target outside allowed directories")
    }
    return realAbsolute
  } catch (_error) {
    const parentDir = path.dirname(absolute)
    try {
      const realParentPath = await fs.realpath(parentDir)
      if (!isWithinWorkspace(realParentPath)) {
        throw new Error("Access denied - parent directory outside allowed directories")
      }
      return absolute
    } catch {
      if (!isWithinWorkspace(absolute)) {
        throw new Error(
          `Access denied - path outside allowed directories: ${absolute} not in ${workspacePath}`,
        )
      }
      throw new Error(`Parent directory does not exist: ${parentDir}`)
    }
  }
}

function isWithinWorkspace(absolutePath: string): boolean {
  return absolutePath === workspacePath || absolutePath.startsWith(`${workspacePath}/`)
}
