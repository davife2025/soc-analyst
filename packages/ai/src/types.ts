export interface InvestigationInput {
  alertId: string
  alertTitle: string
  severity: string
  rawEvent: Record<string, unknown>
  sourceIp?: string | null
  destIp?: string | null
}

export interface InvestigationOutput {
  summary: string
  confidenceScore: number
  attackChain: string[]
  reasoningChain: ReasoningStep[]
  recommendedActions: RecommendedAction[]
}

export interface ReasoningStep {
  step: number
  thought: string
  toolUsed: string | null
  toolResult: unknown | null
  timestamp: string
}

export interface RecommendedAction {
  actionType: string
  description: string
  parameters: Record<string, unknown>
  requiresApproval: boolean
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ThreatIntelResult {
  indicator: string
  indicatorType: 'ip' | 'domain' | 'hash' | 'cve'
  threatScore: number
  malicious: boolean
  source: string
  details: Record<string, unknown>
  expiresAt: string
}
