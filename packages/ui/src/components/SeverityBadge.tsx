import React from 'react'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const colors: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  info: '#6b7280',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span style={{
      backgroundColor: colors[severity],
      color: '#fff',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {severity}
    </span>
  )
}
