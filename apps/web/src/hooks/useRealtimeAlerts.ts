'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@soc/db'
import type { Database } from '@soc/db'

type Alert = Database['public']['Tables']['alerts']['Row']
type Investigation = Database['public']['Tables']['investigations']['Row']

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    const db = createClient()
    const { data } = await db
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setAlerts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAlerts()
    const db = createClient()
    const channel = db
      .channel('alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev].slice(0, 50))
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts(prev => prev.map(a => a.id === (payload.new as Alert).id ? payload.new as Alert : a))
        }
      )
      .subscribe()

    return () => { db.removeChannel(channel) }
  }, [fetchAlerts])

  return { alerts, loading, refetch: fetchAlerts }
}

export function useRealtimeInvestigations(alertId?: string) {
  const [investigations, setInvestigations] = useState<Investigation[]>([])

  useEffect(() => {
    const db = createClient()
    let query = db.from('investigations').select('*').order('created_at', { ascending: false })
    if (alertId) query = query.eq('alert_id', alertId)

    query.then(({ data }) => { if (data) setInvestigations(data) })

    const channel = db
      .channel('investigations-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investigations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInvestigations(prev => [payload.new as Investigation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setInvestigations(prev => prev.map(i =>
              i.id === (payload.new as Investigation).id ? payload.new as Investigation : i
            ))
          }
        }
      )
      .subscribe()

    return () => { db.removeChannel(channel) }
  }, [alertId])

  return { investigations }
}
