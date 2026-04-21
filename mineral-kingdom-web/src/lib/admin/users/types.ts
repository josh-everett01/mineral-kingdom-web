export type AdminUserListItem = {
  id: string
  email: string
  emailVerified: boolean
  role: string
  createdAt: string
  updatedAt: string
}

export type AdminUserRoleHistoryItem = {
  actionType: string
  fromRole: string | null
  toRole: string | null
  actorUserId: string | null
  actorRole: string | null
  createdAt: string
}

export type AdminUserDetail = {
  id: string
  email: string
  emailVerified: boolean
  role: string
  createdAt: string
  updatedAt: string
  roleHistory: AdminUserRoleHistoryItem[]
}

export type GetAdminUsersParams = {
  email?: string
}

export type UpdateAdminUserRoleRequest = {
  role: string
}