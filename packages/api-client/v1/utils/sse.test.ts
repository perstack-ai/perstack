import { describe, expect, it } from "vitest"
import { parseSSE } from "./sse.js"

describe("@repo/api-client: parseSSE", () => {
  it("should parse server-sent events correctly", async () => {
    const events = [
      { type: "start", data: "Starting..." },
      { type: "progress", data: "Processing..." },
      { type: "complete", data: "Done!" },
    ]

    const encoder = new TextEncoder()
    const sseData = events
      .map((event) => `event: message\ndata: ${JSON.stringify(event)}\n\n`)
      .join("")

    let position = 0
    const reader = {
      read: async () => {
        if (position >= sseData.length) {
          return { done: true, value: undefined }
        }
        const chunk = sseData.slice(position)
        position = sseData.length
        return { done: false, value: encoder.encode(chunk) }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual(events)
  })

  it("should handle partial chunks", async () => {
    const event = { type: "test", data: "Test data" }
    const encoder = new TextEncoder()
    const sseData = `event: message\ndata: ${JSON.stringify(event)}\n\n`

    const chunks = [sseData.slice(0, 10), sseData.slice(10, 20), sseData.slice(20)]

    let chunkIndex = 0
    const reader = {
      read: async () => {
        if (chunkIndex >= chunks.length) {
          return { done: true, value: undefined }
        }
        const chunk = chunks[chunkIndex++]
        return { done: false, value: encoder.encode(chunk) }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const results = []
    for await (const parsedEvent of parseSSE(reader)) {
      results.push(parsedEvent)
    }

    expect(results).toEqual([event])
  })

  it("should ignore events without message type", async () => {
    const encoder = new TextEncoder()
    const sseData = `event: ping\ndata: {"ping": "pong"}\n\nevent: message\ndata: {"type": "test"}\n\n`

    const reader = {
      read: async () => {
        return { done: false, value: encoder.encode(sseData) }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    let readCount = 0
    reader.read = async () => {
      if (readCount++ === 0) {
        return { done: false, value: encoder.encode(sseData) }
      }
      return { done: true, value: undefined }
    }

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual([{ type: "test" }])
  })

  it("should handle empty lines and events", async () => {
    const encoder = new TextEncoder()
    const sseData = `\n\nevent: message\ndata: {"test": 1}\n\n\n\nevent: message\ndata: {"test": 2}\n\n`

    const reader = {
      read: async () => {
        return { done: false, value: encoder.encode(sseData) }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    let readCount = 0
    reader.read = async () => {
      if (readCount++ === 0) {
        return { done: false, value: encoder.encode(sseData) }
      }
      return { done: true, value: undefined }
    }

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual([{ test: 1 }, { test: 2 }])
  })

  it("should handle incomplete event at the end", async () => {
    const encoder = new TextEncoder()
    const completeEvent = `event: message\ndata: {"complete": true}\n\n`
    const incompleteEvent = `event: message\ndata: {"incomplete":`

    const chunks = [completeEvent, incompleteEvent]
    let chunkIndex = 0

    const reader = {
      read: async () => {
        if (chunkIndex >= chunks.length) {
          return { done: true, value: undefined }
        }
        const chunk = chunks[chunkIndex++]
        return { done: false, value: encoder.encode(chunk) }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual([{ complete: true }])
  })

  it("should throw on malformed JSON", async () => {
    const encoder = new TextEncoder()
    const sseData = `event: message\ndata: {invalid json}\n\n`

    let readCount = 0
    const reader = {
      read: async () => {
        if (readCount++ === 0) {
          return { done: false, value: encoder.encode(sseData) }
        }
        return { done: true, value: undefined }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const generator = parseSSE(reader)
    await expect(generator.next()).rejects.toThrow(SyntaxError)
  })

  it("should skip events with missing data field", async () => {
    const encoder = new TextEncoder()
    const sseData = `event: message\n\n\nevent: message\ndata: {"valid": true}\n\n`

    let readCount = 0
    const reader = {
      read: async () => {
        if (readCount++ === 0) {
          return { done: false, value: encoder.encode(sseData) }
        }
        return { done: true, value: undefined }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual([{ valid: true }])
  })

  it("should skip events with data but no event type", async () => {
    const encoder = new TextEncoder()
    const sseData = `data: {"no": "event"}\n\nevent: message\ndata: {"has": "event"}\n\n`

    let readCount = 0
    const reader = {
      read: async () => {
        if (readCount++ === 0) {
          return { done: false, value: encoder.encode(sseData) }
        }
        return { done: true, value: undefined }
      },
    } as ReadableStreamDefaultReader<Uint8Array>

    const results = []
    for await (const event of parseSSE(reader)) {
      results.push(event)
    }

    expect(results).toEqual([{ has: "event" }])
  })
})
