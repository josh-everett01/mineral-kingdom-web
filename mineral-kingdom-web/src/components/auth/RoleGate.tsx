import type { ReactNode } from "react"

type RoleGateProps = {
  userRoles: readonly string[]
  allowedRoles: readonly string[]
  children: ReactNode
  mode?: "hidden" | "disabled"
  fallback?: ReactNode
}

function hasAllowedRole(userRoles: readonly string[], allowedRoles: readonly string[]) {
  const granted = new Set(userRoles)
  return allowedRoles.some((role) => granted.has(role))
}

export function RoleGate({
  userRoles,
  allowedRoles,
  children,
  mode = "hidden",
  fallback = null,
}: RoleGateProps) {
  const allowed = hasAllowedRole(userRoles, allowedRoles)

  if (allowed) {
    return <>{children}</>
  }

  if (mode === "disabled") {
    return <>{fallback}</>
  }

  return null
}