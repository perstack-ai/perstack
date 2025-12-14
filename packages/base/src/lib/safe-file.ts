import type { FileHandle } from "node:fs/promises"
import { constants, lstat, open } from "node:fs/promises"

const O_NOFOLLOW = constants.O_NOFOLLOW ?? 0
const O_NOFOLLOW_SUPPORTED = typeof constants.O_NOFOLLOW === "number"

async function checkNotSymlink(path: string): Promise<void> {
  const stats = await lstat(path).catch(() => null)
  if (stats?.isSymbolicLink()) {
    throw new Error("Operation denied: target is a symbolic link")
  }
}

export function isSymlinkProtectionFullySupported(): boolean {
  return O_NOFOLLOW_SUPPORTED
}

export async function safeWriteFile(path: string, data: string): Promise<void> {
  let handle: FileHandle | undefined
  try {
    await checkNotSymlink(path)
    const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | O_NOFOLLOW
    handle = await open(path, flags, 0o644)
    await handle.writeFile(data, "utf-8")
  } finally {
    await handle?.close()
  }
}

export async function safeReadFile(path: string): Promise<string> {
  let handle: FileHandle | undefined
  try {
    await checkNotSymlink(path)
    const flags = constants.O_RDONLY | O_NOFOLLOW
    handle = await open(path, flags)
    const buffer = await handle.readFile("utf-8")
    return buffer
  } finally {
    await handle?.close()
  }
}

export async function safeAppendFile(path: string, data: string): Promise<void> {
  let handle: FileHandle | undefined
  try {
    await checkNotSymlink(path)
    const flags = constants.O_WRONLY | constants.O_APPEND | O_NOFOLLOW
    handle = await open(path, flags)
    await handle.writeFile(data, "utf-8")
  } finally {
    await handle?.close()
  }
}

