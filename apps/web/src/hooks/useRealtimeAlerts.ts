'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@soc/auth'
import type { Database } from '@soc/db'

type Alert = Database['public']['Tables']['alerts']['Row']
type Investigation = Database['public']['Tables']['investigations']['Row']

export function useRealtimeAlerts(initialAlerts: Alert[] = []) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [loading, setLoading] = useState(!initialAlerts.length)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const db = createBrowserClient()
      const { data, error } = await db
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      if (data) setAlerts(data)
    } catch (err) {
      console.error('[useRealtimeAlerts] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialAlerts.length) fetchAlerts()

    const db = createBrowserClient()
    const channel = db
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev].slice(0, 50))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts(prev =>
            prev.map(a => a.id === (payload.new as Alert).id ? { ...a, ...(payload.new as Alert) } : a)
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[realtime] alerts subscribed')
        if (status === 'CHANNEL_ERROR') console.warn('[realtime] alerts channel error — retrying')
      })

    channelRef.current = channel
    return () => { db.removeChannel(channel) }
  }, [fetchAlerts, initialAlerts.length])

  return { alerts, loading, refetch: fetchAlerts }
}

export function useRealtimeInvestigations(initialInvestigations: Investigation[] = []) {
  const [investigations, setInvestigations] = useState<Investigation[]>(initialInvestigations)

  useEffect(() => {
    const db = createBrowserClient()

    if (!initialInvestigations.length) {
      db.from('investigations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => { if (data) setInvestigations(data) })
    }

    const channel = db
      .channel('investigations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'investigations' },
        (payload) => {
          setInvestigations(prev => [payload.new as Investigation, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'investigations' },
        (payload) => {
          setInvestigations(prev =>
            prev.map(i => i.id === (payload.new as Investigation).id ? { ...i, ...(payload.new as Investigation) } : i)
          )
        }
      )
      .subscribe()

    return () => { db.removeChannel(channel) }
  }, [initialInvestigations.length])

  return { investigations }
}
