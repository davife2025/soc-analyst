import { createServerClient as supabaseServerClient, createBrowserClient as supabaseBrowserClient } from '@supabase/ssr'
import type { Database } from '@soc/db'

export function createServerClient(
  cookieStore: { get: (name: string) => { value: string } | undefined }
) {
  return supabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
      },
    }
  )
}

export function createBrowserClient() {
  return supabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
