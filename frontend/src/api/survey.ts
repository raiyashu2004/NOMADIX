import apiClient from './client'

export const submitSurveyApi = (groupId: string, budget: string, vibe: string, pace: string) =>
  apiClient.post(`/api/groups/${groupId}/survey`, { budget, vibe, pace })

export const getSurveyStatusApi = (groupId: string) =>
  apiClient.get(`/api/groups/${groupId}/survey`)
