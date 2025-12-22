import type { GenerateTextResult, ToolSet } from "ai"
import type {
  GenerateTextParams,
  LLMExecutionResult,
  StreamCallbacks,
  StreamTextParams,
} from "./types.js"

export class MockLLMExecutor {
  private mockResult: LLMExecutionResult | null = null

  setMockResult(result: LLMExecutionResult): void {
    this.mockResult = result
  }

  async generateText(_params: GenerateTextParams): Promise<LLMExecutionResult> {
    if (this.mockResult) {
      return this.mockResult
    }
    return {
      success: true,
      result: {
        text: "",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        rawResponse: undefined,
        response: { id: "mock", timestamp: new Date(), modelId: "mock", headers: {} },
        request: {},
        toolCalls: [],
        toolResults: [],
        warnings: [],
        sources: [],
        providerMetadata: undefined,
        reasoning: undefined,
        reasoningDetails: [],
        files: [],
        logprobs: undefined,
        toJsonResponse: () => new Response(),
        experimental_output: undefined,
        steps: [],
        rawCall: {},
      } as unknown as GenerateTextResult<ToolSet, never>,
    }
  }

  async generateTextWithoutTools(
    params: Omit<
      GenerateTextParams,
      "tools" | "toolChoice" | "providerToolNames" | "providerToolOptions"
    >,
  ): Promise<LLMExecutionResult> {
    return this.generateText(params as GenerateTextParams)
  }

  async streamText(
    _params: StreamTextParams,
    _callbacks: StreamCallbacks,
  ): Promise<LLMExecutionResult> {
    // streamText returns the same as generateText for mocking purposes
    // Callbacks are not invoked in mock since we're not actually streaming
    if (this.mockResult) {
      return this.mockResult
    }
    return {
      success: true,
      result: {
        text: "",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        rawResponse: undefined,
        response: { id: "mock", timestamp: new Date(), modelId: "mock", headers: {} },
        request: {},
        toolCalls: [],
        toolResults: [],
        warnings: [],
        sources: [],
        providerMetadata: undefined,
        reasoning: undefined,
        reasoningDetails: [],
        files: [],
        logprobs: undefined,
        toJsonResponse: () => new Response(),
        experimental_output: undefined,
        steps: [],
        rawCall: {},
      } as unknown as GenerateTextResult<ToolSet, never>,
    }
  }
}

export function createMockLLMExecutor(): MockLLMExecutor {
  return new MockLLMExecutor()
}
