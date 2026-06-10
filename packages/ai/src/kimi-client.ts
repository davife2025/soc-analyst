import OpenAI from 'openai'

export class KimiClient {
  private client: OpenAI

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not set')

    this.client = new OpenAI({
      apiKey,
      // HF Inference API OpenAI-compatible endpoint
      baseURL: 'https://api-inference.huggingface.co/v1',
      defaultHeaders: {
        'X-Wait-For-Model': 'true', // Wait if model is loading (cold start)
      },
    })
  }

  async chat(
    messages: OpenAI.ChatCompletionMessageParam[],
    tools?: OpenAI.ChatCompletionTool[]
  ): Promise<OpenAI.ChatCompletion> {
    const model = process.env.KIMI_MODEL ?? 'moonshotai/Kimi-K2-Instruct'

    try {
      return await this.client.chat.completions.create({
        model,
        messages,
        tools: tools?.length ? tools : undefined,
        tool_choice: tools?.length ? 'auto' : undefined,
        max_tokens: 4096,
        temperature: 0.1,
      })
    } catch (err) {
      // HF can return 503 when model is loading — provide clear error
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('503') || msg.includes('loading')) {
        throw new Error(`Kimi K2 model is loading on HuggingFace. Retry in 20s. Original: ${msg}`)
      }
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        throw new Error(`Invalid HUGGINGFACE_API_KEY. Check your .env. Original: ${msg}`)
      }
      throw err
    }
  }
}
