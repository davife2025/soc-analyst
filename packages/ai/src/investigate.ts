import { KimiClient } from './kimi-client'
import { SYSTEM_PROMPT, INVESTIGATION_PROMPT } from './prompts'
import type { InvestigationInput, InvestigationOutput, ReasoningStep } from './types'
import type OpenAI from 'openai'

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_threat_intel',
      description: 'Look up threat intelligence for an IP, domain, file hash, or CVE',
      parameters: {
        type: 'object',
        properties: {
          indicator: { type: 'string', description: 'The IP, domain, hash, or CVE to look up' },
          indicator_type: { type: 'string', enum: ['ip', 'domain', 'hash', 'cve'] }
        },
        required: ['indicator', 'indicator_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_splunk',
      description: 'Search Splunk for correlated events',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SPL search query' },
          timerange: { type: 'string', description: 'Time range e.g. -1h, -24h', default: '-1h' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_host_context',
      description: 'Get recent activity and baseline for a host',
      parameters: {
        type: 'object',
        properties: {
          hostname: { type: 'string' }
        },
        required: ['hostname']
      }
    }
  }
]

export async function investigateAlert(
  input: InvestigationInput,
  toolHandlers: Record<string, (params: unknown) => Promise<unknown>>
): Promise<InvestigationOutput> {
  const client = new KimiClient()
  const reasoningChain: ReasoningStep[] = []
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: INVESTIGATION_PROMPT(JSON.stringify(input, null, 2)) }
  ]

  let stepCount = 0
  const MAX_STEPS = 10

  while (stepCount < MAX_STEPS) {
    const response = await client.chat(messages, TOOLS)
    const choice = response.choices[0]

    if (choice.finish_reason === 'stop') {
      const finalText = choice.message.content ?? ''
      reasoningChain.push({
        step: ++stepCount,
        thought: finalText,
        toolUsed: null,
        toolResult: null,
        timestamp: new Date().toISOString()
      })
      return parseOutput(finalText, reasoningChain)
    }

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      messages.push({ role: 'assistant', content: choice.message.content, tool_calls: choice.message.tool_calls })

      for (const toolCall of choice.message.tool_calls) {
        const params = JSON.parse(toolCall.function.arguments)
        const handler = toolHandlers[toolCall.function.name]
        const result = handler ? await handler(params) : { error: 'Tool not available' }

        reasoningChain.push({
          step: ++stepCount,
          thought: `Calling ${toolCall.function.name}`,
          toolUsed: toolCall.function.name,
          toolResult: result,
          timestamp: new Date().toISOString()
        })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        })
      }
    }
  }

  return parseOutput('Max steps reached, investigation incomplete.', reasoningChain)
}

function parseOutput(text: string, reasoningChain: ReasoningStep[]): InvestigationOutput {
  return {
    summary: text,
    confidenceScore: 0.5,
    attackChain: [],
    reasoningChain,
    recommendedActions: []
  }
}
