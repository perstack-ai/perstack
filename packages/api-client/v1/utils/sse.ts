export async function* parseSSE<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<T> {
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() || ""

    for (const event of events) {
      if (event.trim() === "") continue

      const lines = event.split("\n")
      const eventType = lines
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim()
      const data = lines
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim()

      if (eventType !== "message" || !data) {
        continue
      }

      yield JSON.parse(data) as T
    }
  }
}
