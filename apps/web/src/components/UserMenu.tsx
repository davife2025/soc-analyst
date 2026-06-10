'use client'
import { useState } from 'react'
import { createBrowserClient } from '@soc/auth'
import type { AuthUser } from '@soc/auth'
import styles from './UserMenu.module.css'

const ROLE_COLORS = { admin: '#f59e0b', analyst: '#3b82f6', viewer: '#64748b' }

export function UserMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.avatar}>{user.email[0].toUpperCase()}</span>
        <span className={styles.email}>{user.email}</span>
        <span className={styles.role} style={{ color: ROLE_COLORS[user.role] }}>{user.role}</span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.name}>{user.name ?? user.email}</p>
            <p className={styles.roleLabel}>{user.role}</p>
          </div>
          <button className={styles.signOut} onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  )
}
