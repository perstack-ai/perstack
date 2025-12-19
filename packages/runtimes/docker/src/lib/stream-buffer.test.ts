import { describe, expect, it, vi } from "vitest"
import { StreamBuffer } from "./stream-buffer.js"

describe("StreamBuffer", () => {
  describe("processChunk", () => {
    it("should emit complete lines", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("line1\nline2\n", onLine)
      expect(onLine).toHaveBeenCalledTimes(2)
      expect(onLine).toHaveBeenNthCalledWith(1, "line1")
      expect(onLine).toHaveBeenNthCalledWith(2, "line2")
    })

    it("should buffer incomplete lines", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("partial", onLine)
      expect(onLine).not.toHaveBeenCalled()
      expect(buffer.getRemaining()).toBe("partial")
    })

    it("should handle multiple chunks", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("par", onLine)
      buffer.processChunk("tial\ncomplete\n", onLine)
      expect(onLine).toHaveBeenCalledTimes(2)
      expect(onLine).toHaveBeenNthCalledWith(1, "partial")
      expect(onLine).toHaveBeenNthCalledWith(2, "complete")
    })
  })

  describe("flush", () => {
    it("should emit remaining buffer content", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("remaining", onLine)
      buffer.flush(onLine)
      expect(onLine).toHaveBeenCalledWith("remaining")
    })

    it("should not emit empty buffer", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.flush(onLine)
      expect(onLine).not.toHaveBeenCalled()
    })

    it("should not emit whitespace-only buffer", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("   ", onLine)
      buffer.flush(onLine)
      expect(onLine).not.toHaveBeenCalled()
    })

    it("should clear buffer after flush", () => {
      const buffer = new StreamBuffer()
      const onLine = vi.fn()
      buffer.processChunk("data", onLine)
      buffer.flush(onLine)
      expect(buffer.getRemaining()).toBe("")
    })
  })

  describe("getRemaining", () => {
    it("should return current buffer content", () => {
      const buffer = new StreamBuffer()
      buffer.processChunk("test", vi.fn())
      expect(buffer.getRemaining()).toBe("test")
    })
  })
})
