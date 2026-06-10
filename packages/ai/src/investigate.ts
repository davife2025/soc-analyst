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
          indicator: { type: 'string' },
          indicator_type: { type: 'string', enum: ['ip', 'domain', 'hash', 'cve'] },
        },
        required: ['indicator', 'indicator_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_splunk',
      description: 'Search Splunk for correlated events using SPL',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          timerange: { type: 'string', default: '-1h' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_host_context',
      description: 'Get recent activity and baseline for a host',
      parameters: {
        type: 'object',
        properties: { hostname: { type: 'string' } },
        required: ['hostname'],
      },
    },
  },
]

export async function investigateAlert(
  input: InvestigationInput,
  toolHandlers: Record<string, (params: unknown) => Promise<unknown>>,
  maxRetries = 2
): Promise<InvestigationOutput> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runInvestigation(input, toolHandlers)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isRetryable = lastError.message.includes('loading') || lastError.message.includes('503')
      if (isRetryable && attempt < maxRetries) {
        console.warn(`[investigate] Retrying (${attempt + 1}/${maxRetries}) after: ${lastError.message}`)
        await sleep(20_000)
        continue
      }
      throw lastError
    }
  }

  throw lastError ?? new Error('Investigation failed after retries')
}

async function runInvestigation(
  input: InvestigationInput,
  toolHandlers: Record<string, (params: unknown) => Promise<unknown>>
): Promise<InvestigationOutput> {
  const client = new KimiClient()
  const reasoningChain: ReasoningStep[] = []
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: INVESTIGATION_PROMPT(JSON.stringify(input, null, 2)) },
  ]

  let stepCount = 0
  const MAX_STEPS = 12

  while (stepCount < MAX_STEPS) {
    const response = await client.chat(messages, TOOLS)
    const choice = response.choices[0]

    if (!choice) throw new Error('Empty response from Kimi K2')

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
      const finalText = choice.message.content ?? ''
      reasoningChain.push({
        step: ++stepCount,
        thought: finalText,
        tool_used: null,
        tool_result: null,
        timestamp: new Date().toISOString(),
      })
      return parseOutput(finalText, reasoningChain)
    }

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      messages.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      })

      for (const toolCall of choice.message.tool_calls) {
        let params: unknown
        try { params = JSON.parse(toolCall.function.arguments) }
        catch { params = {} }

        const handler = toolHandlers[toolCall.function.name]
        let result: unknown
        try {
          result = handler ? await handler(params) : { error: `Tool ${toolCall.function.name} not available` }
        } catch (err) {
          result = { error: String(err) }
        }

        reasoningChain.push({
          step: ++stepCount,
          thought: `Calling ${toolCall.function.name}(${JSON.stringify(params)})`,
          tool_used: toolCall.function.name,
          tool_result: result,
          timestamp: new Date().toISOString(),
        })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
    } else {
      // Unexpected finish reason — wrap up
      const text = choice.message.content ?? 'Investigation ended unexpectedly'
      reasoningChain.push({ step: ++stepCount, thought: text, tool_used: null, tool_result: null, timestamp: new Date().toISOString() })
      return parseOutput(text, reasoningChain)
    }
  }

  return parseOutput('Maximum investigation steps reached.', reasoningChain)
}

function parseOutput(text: string, reasoningChain: ReasoningStep[]): InvestigationOutput {
  // Try to extract structured data from the model's response
  const confidenceMatch = text.match(/confidence[:\s]+([0-9.]+)/i)
  const confidence = confidenceMatch ? Math.min(1, parseFloat(confidenceMatch[1]) / (parseFloat(confidenceMatch[1]) > 1 ? 100 : 1)) : 0.5

  // Extract attack chain bullet points if present
  const attackChainMatch = text.match(/attack chain[:\s\n]+((?:[-•*]\s*.+\n?)+)/i)
  const attackChain = attackChainMatch
    ? attackChainMatch[1].split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    : []

  // Extract recommended actions
  const recommendedActions = extractActions(text)

  return {
    summary: text,
    confidenceScore: confidence,
    attackChain,
    reasoningChain,
    recommendedActions,
  }
}

function extractActions(text: string) {
  const actions = []
  const actionPatterns = [
    { pattern: /block.{0,20}ip/i,          type: 'block_ip',          requiresApproval: true },
    { pattern: /isolat.{0,20}host/i,        type: 'isolate_host',      requiresApproval: true },
    { pattern: /reset.{0,20}credential/i,   type: 'reset_credentials', requiresApproval: true },
    { pattern: /notif.{0,20}team/i,         type: 'notify_team',       requiresApproval: false },
    { pattern: /creat.{0,20}ticket/i,       type: 'create_ticket',     requiresApproval: false },
    { pattern: /collect.{0,20}forensic/i,   type: 'collect_forensics', requiresApproval: true },
    { pattern: /watchlist/i,                type: 'add_to_watchlist',  requiresApproval: false },
  ]

  for (const { pattern, type, requiresApproval } of actionPatterns) {
    if (pattern.test(text)) {
      actions.push({
        actionType: type,
        description: `Recommended by agent: ${type.replace(/_/g, ' ')}`,
        parameters: {},
        requiresApproval,
      })
    }
  }

  return actions
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
