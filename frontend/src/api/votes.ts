import apiClient from './client'

export const castVoteApi = (groupId: string, destinationId: string) =>
  apiClient.post(`/api/groups/${groupId}/votes`, { destinationId })

export const getVotesApi = (groupId: string) =>
  apiClient.get(`/api/groups/${groupId}/votes`)
