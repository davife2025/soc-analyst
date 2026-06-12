import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient as supabaseServerClient } from '@supabase/ssr'
import type { Database } from '@soc/db'
import type { AuthUser, UserRole } from './types'

export async function createRequestClient() {
  const cookieStore = await cookies()
  return supabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie setting no-op, handled by middleware
          }
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = await createRequestClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createRequestClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return {
    id:    user.id,
    email: user.email!,
    role:  (user.user_metadata?.role as UserRole) ?? 'viewer',
    name:  user.user_metadata?.name ?? null,
  }
}

export async function requireAuth(requiredRole?: UserRole): Promise<AuthUser> {
  const user = await getUser()
  if (!user) redirect('/login')
  const roleOrder: Record<UserRole, number> = { viewer: 0, analyst: 1, admin: 2 }
  if (requiredRole && roleOrder[user.role] < roleOrder[requiredRole]) {
    redirect('/dashboard?error=unauthorized')
  }
  return user
}
