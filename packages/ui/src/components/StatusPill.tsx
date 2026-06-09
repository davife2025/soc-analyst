import React from 'react'

type Status = 'new' | 'investigating' | 'resolved' | 'false_positive' | 'running' | 'complete' | 'needs_review'

const colors: Record<Status, { bg: string; text: string }> = {
  new:            { bg: '#dbeafe', text: '#1e40af' },
  investigating:  { bg: '#fef3c7', text: '#92400e' },
  resolved:       { bg: '#d1fae5', text: '#065f46' },
  false_positive: { bg: '#f3f4f6', text: '#374151' },
  running:        { bg: '#fef3c7', text: '#92400e' },
  complete:       { bg: '#d1fae5', text: '#065f46' },
  needs_review:   { bg: '#fee2e2', text: '#991b1b' },
}

export function StatusPill({ status }: { status: Status }) {
  const c = colors[status] ?? { bg: '#f3f4f6', text: '#374151' }
  return (
    <span style={{
      backgroundColor: c.bg,
      color: c.text,
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 500,
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}
