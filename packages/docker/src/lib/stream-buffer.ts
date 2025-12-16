export class StreamBuffer {
  private buffer = ""

  processChunk(chunk: string, onLine: (line: string) => void): void {
    this.buffer += chunk
    const lines = this.buffer.split("\n")
    this.buffer = lines.pop() ?? ""
    for (const line of lines) {
      onLine(line)
    }
  }

  flush(onLine: (line: string) => void): void {
    if (this.buffer.trim()) {
      onLine(this.buffer)
      this.buffer = ""
    }
  }

  getRemaining(): string {
    return this.buffer
  }
}
