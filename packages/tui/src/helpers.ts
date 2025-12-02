export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value: ${x}`)
}
export const noop = (): void => {}
export const formatTimestamp = (timestamp: number): string => new Date(timestamp).toLocaleString()
export const shortenPath = (fullPath: string, maxLength = 60): string => {
  if (fullPath.length <= maxLength) return fullPath
  const parts = fullPath.split("/")
  if (parts.length <= 2) return fullPath
  const filename = parts[parts.length - 1] ?? ""
  const parentDir = parts[parts.length - 2] ?? ""
  const shortened = `.../${parentDir}/${filename}`
  if (shortened.length <= maxLength) return shortened
  return `.../${filename}`
}
export const summarizeOutput = (
  lines: string[],
  maxLines: number,
): { visible: string[]; remaining: number } => {
  const filtered = lines.filter((l) => l.trim())
  const visible = filtered.slice(0, maxLines)
  const remaining = filtered.length - visible.length
  return { visible, remaining }
}
