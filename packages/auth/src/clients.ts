import { createBrowserClient as supabaseBrowserClient } from '@supabase/ssr'
import type { Database } from '@soc/db'

// Browser client — singleton pattern for client components
let browserClient: ReturnType<typeof supabaseBrowserClient<Database>> | null = null

export function createBrowserClient() {
  if (browserClient) return browserClient
  browserClient = supabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}

// Named export for server usage (re-exported from session.ts)
export { createRequestClient as createServerClient } from './session'
