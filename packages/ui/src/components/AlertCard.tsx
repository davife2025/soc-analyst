import React from 'react'
import { SeverityBadge } from './SeverityBadge'
import { StatusPill } from './StatusPill'

interface AlertCardProps {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: 'new' | 'investigating' | 'resolved' | 'false_positive'
  sourceIp?: string | null
  createdAt: string
  onClick?: () => void
}

export function AlertCard({ title, severity, status, sourceIp, createdAt, onClick }: AlertCardProps) {
  return (
    <div onClick={onClick} style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '12px 16px',
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SeverityBadge severity={severity} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#6b7280' }}>
        <StatusPill status={status} />
        {sourceIp && <span>src: {sourceIp}</span>}
        <span>{new Date(createdAt).toLocaleString()}</span>
      </div>
    </div>
  )
}
