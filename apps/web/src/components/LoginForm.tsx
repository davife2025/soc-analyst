'use client'
import { useState } from 'react'
import { createBrowserClient } from '@soc/auth'
import styles from './LoginForm.module.css'

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'magic'>('signin')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createBrowserClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next ?? '/dashboard'}` }
      })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = next ?? '/dashboard'
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className={styles.sent}>
        <span>📬</span>
        <p>Magic link sent to <strong>{email}</strong></p>
        <p className={styles.sub}>Check your inbox and click the link to sign in.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignIn} className={styles.form}>
      <div className={styles.tabs}>
        <button type="button" className={mode === 'signin' ? styles.activeTab : styles.tab} onClick={() => setMode('signin')}>Password</button>
        <button type="button" className={mode === 'magic' ? styles.activeTab : styles.tab} onClick={() => setMode('magic')}>Magic Link</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.field}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="analyst@company.com"
          required
          autoComplete="email"
        />
      </div>

      {mode === 'signin' && (
        <div className={styles.field}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>
      )}

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? 'Signing in…' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
      </button>
    </form>
  )
}
