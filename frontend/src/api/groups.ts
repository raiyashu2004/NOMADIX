import apiClient from './client'

export const createGroupApi = (name: string) =>
  apiClient.post('/api/groups', { name })

export const joinGroupApi = (inviteCode: string) =>
  apiClient.post('/api/groups/join', { inviteCode })

export const getMyGroupsApi = () => apiClient.get('/api/groups')

export const getGroupApi = (groupId: string) =>
  apiClient.get(`/api/groups/${groupId}`)

export const promoteAdminApi = (groupId: string, memberId: string) =>
  apiClient.post(`/api/groups/${groupId}/admins/${memberId}`)

export const demoteAdminApi = (groupId: string, memberId: string) =>
  apiClient.delete(`/api/groups/${groupId}/admins/${memberId}`)

export const removeMemberApi = (groupId: string, memberId: string) =>
  apiClient.delete(`/api/groups/${groupId}/members/${memberId}`)

export const transferOwnershipApi = (groupId: string, newOwnerId: string) =>
  apiClient.patch(`/api/groups/${groupId}/transfer-ownership`, { newOwnerId })

export const leaveGroupApi = (groupId: string) =>
  apiClient.post(`/api/groups/${groupId}/leave`)

export const deleteGroupApi = (groupId: string) =>
  apiClient.delete(`/api/groups/${groupId}`)
