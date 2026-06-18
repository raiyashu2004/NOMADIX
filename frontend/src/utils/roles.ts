import type { Group, GroupMember } from '../store/party'

export const isOwner = (group: Group | null, userId: string | undefined): boolean => {
  if (!group || !userId) return false
  return typeof group.owner === 'string'
    ? group.owner === userId
    : (group.owner as GroupMember)?._id === userId
}

export const isAdmin = (group: Group | null, userId: string | undefined): boolean => {
  if (!group || !userId || !group.admins) return false
  return group.admins.some(admin => 
    typeof admin === 'string' ? admin === userId : admin._id === userId
  )
}

export const canManageItinerary = (group: Group | null, userId: string | undefined): boolean => {
  return isOwner(group, userId) || isAdmin(group, userId)
}

export const canManageMembers = (group: Group | null, userId: string | undefined): boolean => {
  return isOwner(group, userId) || isAdmin(group, userId)
}
