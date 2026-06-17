import apiClient from './client'

export const generateRecommendationsApi = (groupId: string) =>
  apiClient.post(`/api/groups/${groupId}/recommendations/generate`)

export const getRecommendationsApi = (groupId: string) =>
  apiClient.get(`/api/groups/${groupId}/recommendations`)
