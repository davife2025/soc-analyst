export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertStatus = 'new' | 'investigating' | 'resolved' | 'false_positive'
export type InvestigationStatus = 'running' | 'complete' | 'needs_review'
export type ActionStatus = 'pending' | 'approved' | 'executed' | 'rejected'

export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string
          created_at: string
          splunk_event_id: string
          severity: AlertSeverity
          status: AlertStatus
          title: string
          raw_event: Record<string, unknown>
          source_ip: string | null
          dest_ip: string | null
          source_host: string | null
          tags: string[]
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      investigations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          alert_id: string
          status: InvestigationStatus
          reasoning_chain: ReasoningStep[]
          summary: string | null
          confidence_score: number | null
          attack_chain: string[]
          agent_version: string
        }
        Insert: Omit<Database['public']['Tables']['investigations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['investigations']['Insert']>
      }
      actions: {
        Row: {
          id: string
          created_at: string
          investigation_id: string
          action_type: string
          description: string
          parameters: Record<string, unknown>
          status: ActionStatus
          approved_by: string | null
          executed_at: string | null
          result: string | null
        }
        Insert: Omit<Database['public']['Tables']['actions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['actions']['Insert']>
      }
      threat_intel: {
        Row: {
          id: string
          indicator: string
          indicator_type: 'ip' | 'domain' | 'hash' | 'cve'
          threat_score: number
          source: string
          details: Record<string, unknown>
          cached_at: string
          expires_at: string
        }
        Insert: Omit<Database['public']['Tables']['threat_intel']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['threat_intel']['Insert']>
      }
      playbooks: {
        Row: {
          id: string
          name: string
          description: string
          trigger_conditions: Record<string, unknown>
          auto_execute: boolean
          steps: PlaybookStep[]
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['playbooks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['playbooks']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          before: Record<string, unknown> | null
          after: Record<string, unknown> | null
          metadata: Record<string, unknown>
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
  }
}

export interface ReasoningStep {
  step: number
  thought: string
  tool_used: string | null
  tool_result: unknown | null
  timestamp: string
}

export interface PlaybookStep {
  order: number
  action: string
  parameters: Record<string, unknown>
  requires_approval: boolean
}
