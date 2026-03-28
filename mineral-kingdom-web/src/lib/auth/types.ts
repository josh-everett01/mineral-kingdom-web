export type AuthMe = {
  isAuthenticated: boolean
  user: {
    id: string | null
    email: string | null
  } | null
  roles: string[]
  emailVerified?: boolean
  accessTokenExpiresAtEpochSeconds?: number | null
  code?: string
  message?: string
}