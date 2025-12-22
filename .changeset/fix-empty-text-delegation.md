---
"@perstack/runtime": patch
---

Fixed delegation chain failure when LLM returns empty text response

Some models (like Gemini) may return tool calls without accompanying text. This caused delegation to fail with "delegation result message does not contain a text" error. Now empty text is handled gracefully by using an empty string as fallback.
