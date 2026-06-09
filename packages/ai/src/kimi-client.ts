import OpenAI from 'openai'

// Kimi K2 via Hugging Face uses an OpenAI-compatible endpoint
export class KimiClient {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.HUGGINGFACE_API_KEY!,
      baseURL: 'https://api-inference.huggingface.co/v1',
    })
  }

  async chat(messages: OpenAI.ChatCompletionMessageParam[], tools?: OpenAI.ChatCompletionTool[]) {
    const model = process.env.KIMI_MODEL ?? 'moonshotai/Kimi-K2-Instruct'
    return this.client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: tools ? 'auto' : undefined,
      max_tokens: 4096,
      temperature: 0.1,
    })
  }
}
