export type AlertSeverity          = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertStatus            = 'new' | 'investigating' | 'resolved' | 'false_positive'
export type InvestigationStatus    = 'running' | 'complete' | 'needs_review'
export type ActionStatus           = 'pending' | 'approved' | 'executed' | 'rejected'
export type UserRole               = 'admin' | 'analyst' | 'viewer'
export type NotificationChannelType = 'slack' | 'pagerduty' | 'email'
export type AgentHeartbeatStatus   = 'healthy' | 'degraded' | 'error'

export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: { id: string; created_at: string; splunk_event_id: string; severity: AlertSeverity; status: AlertStatus; title: string; raw_event: Record<string, unknown>; source_ip: string | null; dest_ip: string | null; source_host: string | null; tags: string[] }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      investigations: {
        Row: { id: string; created_at: string; updated_at: string; alert_id: string; status: InvestigationStatus; reasoning_chain: ReasoningStep[]; summary: string | null; confidence_score: number | null; attack_chain: string[]; agent_version: string }
        Insert: Omit<Database['public']['Tables']['investigations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['investigations']['Insert']>
      }
      actions: {
        Row: { id: string; created_at: string; investigation_id: string; action_type: string; description: string; parameters: Record<string, unknown>; status: ActionStatus; approved_by: string | null; executed_at: string | null; result: string | null }
        Insert: Omit<Database['public']['Tables']['actions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['actions']['Insert']>
      }
      threat_intel: {
        Row: { id: string; indicator: string; indicator_type: 'ip' | 'domain' | 'hash' | 'cve'; threat_score: number; source: string; details: Record<string, unknown>; cached_at: string; expires_at: string }
        Insert: Omit<Database['public']['Tables']['threat_intel']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['threat_intel']['Insert']>
      }
      playbooks: {
        Row: { id: string; name: string; description: string; trigger_conditions: Record<string, unknown>; auto_execute: boolean; steps: PlaybookStep[]; active: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['playbooks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['playbooks']['Insert']>
      }
      audit_log: {
        Row: { id: string; created_at: string; entity_type: string; entity_id: string; action: string; actor: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; metadata: Record<string, unknown> }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
      profiles: {
        Row: { id: string; email: string; name: string | null; role: UserRole; created_at: string; last_seen_at: string | null }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      webhook_tokens: {
        Row: { id: string; name: string; token_hash: string; created_by: string | null; created_at: string; last_used_at: string | null; active: boolean }
        Insert: Omit<Database['public']['Tables']['webhook_tokens']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_tokens']['Insert']>
      }
      splunk_schedules: {
        Row: { id: string; name: string; description: string | null; search_query: string; timerange: string; cron_expression: string; active: boolean; last_run_at: string | null; last_run_status: 'success' | 'error' | 'running' | null; last_error: string | null; alerts_created_last_run: number; created_at: string }
        Insert: Omit<Database['public']['Tables']['splunk_schedules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['splunk_schedules']['Insert']>
      }
      notification_channels: {
        Row: { id: string; name: string; type: NotificationChannelType; config: Record<string, unknown>; active: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['notification_channels']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notification_channels']['Insert']>
      }
      notification_log: {
        Row: { id: string; channel_id: string | null; channel_type: string; alert_id: string | null; investigation_id: string | null; status: 'sent' | 'failed' | 'skipped'; payload: Record<string, unknown>; error: string | null; sent_at: string }
        Insert: Omit<Database['public']['Tables']['notification_log']['Row'], 'id' | 'sent_at'>
        Update: never
      }
      alert_notes: {
        Row: { id: string; alert_id: string; author_id: string | null; author_email: string; content: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['alert_notes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<Database['public']['Tables']['alert_notes']['Row'], 'content'>>
      }
      agent_heartbeats: {
        Row: { id: string; agent_version: string; status: AgentHeartbeatStatus; alerts_queued: number; alerts_processed_1h: number; last_investigation_at: string | null; last_error: string | null; metadata: Record<string, unknown>; created_at: string }
        Insert: Omit<Database['public']['Tables']['agent_heartbeats']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['agent_heartbeats']['Insert']>
      }
    }
  }
}

export interface ReasoningStep  { step: number; thought: string; tool_used: string | null; tool_result: unknown | null; timestamp: string }
export interface PlaybookStep   { order: number; action: string; parameters: Record<string, unknown>; requires_approval: boolean }
