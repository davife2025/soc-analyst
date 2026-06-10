'use client'
import { useState } from 'react'
import styles from './TokenManager.module.css'

interface Token {
  id: string
  name: string
  active: boolean
  created_at: string
  last_used_at: string | null
}

export function TokenManager({ tokens: initial, createdBy }: { tokens: Token[]; createdBy: string }) {
  const [tokens, setTokens] = useState<Token[]>(initial)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function createToken() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), created_by: createdBy }),
    })
    if (res.ok) {
      const { token, record } = await res.json() as { token: string; record: Token }
      setTokens(prev => [record, ...prev])
      setNewToken(token)
      setNewName('')
    }
    setCreating(false)
  }

  async function revokeToken(id: string) {
    setRevoking(id)
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
    if (res.ok) setTokens(prev => prev.map(t => t.id === id ? { ...t, active: false } : t))
    setRevoking(null)
  }

  async function copyToken() {
    if (!newToken) return
    await navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.wrap}>
      {newToken && (
        <div className={styles.newTokenAlert}>
          <p className={styles.newTokenTitle}>⚠️ Copy this token now — it will never be shown again</p>
          <div className={styles.tokenRow}>
            <code className={styles.tokenValue}>{newToken}</code>
            <button className={styles.copyBtn} onClick={copyToken}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button className={styles.dismiss} onClick={() => setNewToken(null)}>I've saved the token →</button>
        </div>
      )}

      <div className={styles.createRow}>
        <input
          className={styles.input}
          placeholder="Token name (e.g. splunk-prod)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createToken()}
        />
        <button className={styles.createBtn} onClick={createToken} disabled={creating || !newName.trim()}>
          {creating ? 'Creating…' : '+ Generate Token'}
        </button>
      </div>

      <div className={styles.list}>
        {tokens.length === 0 && (
          <div className={styles.empty}>No tokens yet. Generate one above to connect Splunk.</div>
        )}
        {tokens.map(token => (
          <div key={token.id} className={styles.tokenCard} data-active={token.active}>
            <div className={styles.tokenInfo}>
              <div className={styles.tokenHeader}>
                <span className={styles.indicator} data-active={token.active} />
                <span className={styles.tokenName}>{token.name}</span>
                {!token.active && <span className={styles.revokedBadge}>Revoked</span>}
              </div>
              <div className={styles.tokenMeta}>
                <span>Created {new Date(token.created_at).toLocaleDateString()}</span>
                {token.last_used_at
                  ? <span>Last used {new Date(token.last_used_at).toLocaleDateString()}</span>
                  : <span className={styles.unused}>Never used</span>}
              </div>
            </div>
            {token.active && (
              <button
                className={styles.revokeBtn}
                onClick={() => revokeToken(token.id)}
                disabled={revoking === token.id}
              >
                {revoking === token.id ? '…' : 'Revoke'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
