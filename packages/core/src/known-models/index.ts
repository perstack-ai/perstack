export const knownModels = [
  {
    provider: "anthropic",
    models: [
      // https://docs.claude.com/en/docs/about-claude/models/overview#model-comparison-table
      {
        name: "claude-opus-4-5",
        contextWindow: 200_000,
        maxOutputTokens: 32_000,
      },
      {
        name: "claude-opus-4-1",
        contextWindow: 200_000,
        maxOutputTokens: 32_000,
      },
      {
        name: "claude-opus-4-20250514",
        contextWindow: 200_000,
        maxOutputTokens: 32_000,
      },
      {
        name: "claude-sonnet-4-5",
        contextWindow: 200_000,
        maxOutputTokens: 64_000,
      },
      {
        name: "claude-sonnet-4-20250514",
        contextWindow: 200_000,
        maxOutputTokens: 64_000,
      },
      {
        name: "claude-3-7-sonnet-20250219",
        contextWindow: 200_000,
        maxOutputTokens: 64_000,
      },
      {
        name: "claude-haiku-4-5",
        contextWindow: 200_000,
        maxOutputTokens: 8_192,
      },
      {
        name: "claude-3-5-haiku-latest",
        contextWindow: 200_000,
        maxOutputTokens: 8_192,
      },
    ],
  },
  {
    provider: "google",
    models: [
      // https://ai.google.dev/gemini-api/docs/models#gemini-3-pro
      {
        name: "gemini-3-pro-preview",
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
      // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro
      {
        name: "gemini-2.5-pro",
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
      // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash
      {
        name: "gemini-2.5-flash",
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
      // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-lite
      {
        name: "gemini-2.5-flash-lite",
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
    ],
  },
  {
    provider: "openai",
    models: [
      // https://platform.openai.com/docs/models/gpt-5
      {
        name: "gpt-5",
        contextWindow: 400_000,
        maxOutputTokens: 128_000,
      },
      // https://platform.openai.com/docs/models/gpt-5-mini
      {
        name: "gpt-5-mini",
        contextWindow: 400_000,
        maxOutputTokens: 128_000,
      },
      // https://platform.openai.com/docs/models/gpt-5-nano
      {
        name: "gpt-5-nano",
        contextWindow: 400_000,
        maxOutputTokens: 128_000,
      },
      // https://platform.openai.com/docs/models/gpt-5-chat-latest
      {
        name: "gpt-5-chat-latest",
        contextWindow: 128_000,
        maxOutputTokens: 16_384,
      },
      // https://platform.openai.com/docs/models/o4-mini
      {
        name: "o4-mini",
        contextWindow: 200_000,
        maxOutputTokens: 100_000,
      },
      // https://platform.openai.com/docs/models/o3
      {
        name: "o3",
        contextWindow: 200_000,
        maxOutputTokens: 10_000,
      },
      // https://platform.openai.com/docs/models/o3-mini
      {
        name: "o3-mini",
        contextWindow: 200_000,
        maxOutputTokens: 10_000,
      },
      // https://platform.openai.com/docs/models/gpt-4.1
      {
        name: "gpt-4.1",
        contextWindow: 1_047_576,
        maxOutputTokens: 32_768,
      },
    ],
  },
  {
    provider: "deepseek",
    models: [
      {
        name: "deepseek-chat",
        contextWindow: 128_000,
        maxOutputTokens: 8_192,
      },
      {
        name: "deepseek-reasoner",
        contextWindow: 128_000,
        maxOutputTokens: 64_000,
      },
    ],
  },
  {
    provider: "ollama",
    models: [
      // https://platform.openai.com/docs/models/gpt-oss-20b
      {
        name: "gpt-oss:20b",
        contextWindow: 131_072,
        maxOutputTokens: 131_072,
      },
      // https://platform.openai.com/docs/models/gpt-oss-120b
      {
        name: "gpt-oss:120b",
        contextWindow: 131_072,
        maxOutputTokens: 131_072,
      },
      // https://ai.google.dev/gemma/docs/core/model_card_3
      {
        name: "gemma3:1b",
        contextWindow: 32_000,
        maxOutputTokens: 32_000,
      },
      // https://ai.google.dev/gemma/docs/core/model_card_3
      {
        name: "gemma3:4b",
        contextWindow: 128_000,
        maxOutputTokens: 128_000,
      },
      // https://ai.google.dev/gemma/docs/core/model_card_3
      {
        name: "gemma3:12b",
        contextWindow: 128_000,
        maxOutputTokens: 128_000,
      },
      // https://ai.google.dev/gemma/docs/core/model_card_3
      {
        name: "gemma3:27b",
        contextWindow: 128_000,
        maxOutputTokens: 128_000,
      },
    ],
  },
]
