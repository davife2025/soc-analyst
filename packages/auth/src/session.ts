import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from './clients'
import type { AuthUser, UserRole } from './types'

export async function getSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    id: user.id,
    email: user.email!,
    role: (user.user_metadata?.role as UserRole) ?? 'viewer',
    name: user.user_metadata?.name ?? null,
  }
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getUser()
  if (!user) redirect('/login')

  const roleOrder: Record<UserRole, number> = { viewer: 0, analyst: 1, admin: 2 }
  if (requiredRole && roleOrder[user.role] < roleOrder[requiredRole]) {
    redirect('/dashboard?error=unauthorized')
  }
  return user
}
