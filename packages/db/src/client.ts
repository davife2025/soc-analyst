import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import type { Database } from './types'

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

// Anon client — for browser/client-side usage
export function createClient() {
  return supabaseCreateClient<Database>(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: true } }
  )
}

// Service role client — server-side only, bypasses RLS
export function createServiceClient() {
  return supabaseCreateClient<Database>(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
