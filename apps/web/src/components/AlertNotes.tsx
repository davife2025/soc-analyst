'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@soc/auth'
import styles from './AlertNotes.module.css'
import type { Database } from '@soc/db'

type Note = Database['public']['Tables']['alert_notes']['Row']

interface Props {
  alertId: string
  initialNotes: Note[]
  currentUserEmail: string
  canWrite: boolean
}

export function AlertNotes({ alertId, initialNotes, currentUserEmail, canWrite }: Props) {
  const [notes, setNotes]     = useState<Note[]>(initialNotes)
  const [content, setContent] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const bottomRef             = useRef<HTMLDivElement>(null)

  // Supabase Realtime subscription for live notes
  useEffect(() => {
    const db = createBrowserClient()
    const channel = db
      .channel(`alert-notes-${alertId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'alert_notes',
        filter: `alert_id=eq.${alertId}`,
      }, (payload) => {
        setNotes(prev => {
          // avoid duplicate if this client posted it
          if (prev.some(n => n.id === (payload.new as Note).id)) return prev
          return [...prev, payload.new as Note]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [alertId])

  async function postNote(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/alerts/${alertId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    if (res.ok) {
      const note = await res.json() as Note
      setNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note])
      setContent('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      const { error: e } = await res.json() as { error: string }
      setError(e)
    }
    setSaving(false)
  }

  function initials(email: string) {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  function avatarColor(email: string) {
    const colors = ['#1d4ed8','#7c3aed','#0369a1','#047857','#b45309','#be123c']
    let hash = 0
    for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
    return colors[hash % colors.length]
  }

  return (
    <div className={styles.wrap}>
      {notes.length === 0 && (
        <p className={styles.empty}>No notes yet — add context about this alert</p>
      )}

      <div className={styles.feed}>
        {notes.map(note => {
          const isOwn = note.author_email === currentUserEmail
          return (
            <div key={note.id} className={`${styles.note} ${isOwn ? styles.own : ''}`}>
              <div className={styles.avatar}
                style={{ background: avatarColor(note.author_email) }}>
                {initials(note.author_email)}
              </div>
              <div className={styles.bubble}>
                <div className={styles.noteHeader}>
                  <span className={styles.author}>{note.author_email.split('@')[0]}</span>
                  <span className={styles.time}>{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className={styles.content}>{note.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {canWrite && (
        <form onSubmit={postNote} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.inputRow}>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add a note… (Shift+Enter for new line)"
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postNote(e) }
              }}
            />
            <button type="submit" className={styles.postBtn} disabled={saving || !content.trim()}>
              {saving ? '…' : '↑'}
            </button>
          </div>
          <p className={styles.hint}>Enter to post · Shift+Enter for new line</p>
        </form>
      )}
      {!canWrite && <p className={styles.readOnly}>Viewer — cannot post notes</p>}
    </div>
  )
}
