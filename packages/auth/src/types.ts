export type UserRole = 'admin' | 'analyst' | 'viewer'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string | null
}
