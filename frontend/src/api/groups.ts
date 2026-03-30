import apiClient from './client'

export const createGroupApi = (name: string) =>
  apiClient.post('/api/groups', { name })

export const joinGroupApi = (inviteCode: string) =>
  apiClient.post('/api/groups/join', { inviteCode })

export const getMyGroupsApi = () => apiClient.get('/api/groups')

export const getGroupApi = (groupId: string) =>
  apiClient.get(`/api/groups/${groupId}`)
