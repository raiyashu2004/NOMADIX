import { create } from 'zustand'
import { submitSurveyApi, getSurveyStatusApi } from '../api/survey'
import { generateRecommendationsApi, getRecommendationsApi } from '../api/recommendations'
import { castVoteApi, getVotesApi } from '../api/votes'

export type DestinationTag = {
  budget: string
  vibe: string
  pace: string
}

export type Destination = {
  _id: string
  name: string
  country: string
  region: string
  description: string
  imageUrl: string
  tags: DestinationTag
}

export type TopDestination = {
  destination: Destination
  score: number
  matchedTags: string[]
}

export type SurveyRespondent = {
  userId: string
  name: string
  email: string
  submittedAt: string
}

export type VoteCount = {
  destinationId: string
  count: number
}

type SurveyStatus = {
  totalMembers: number
  respondents: SurveyRespondent[]
  pendingMembers: { userId: string; name: string }[]
}

type ConsensusStore = {
  surveyStatus: SurveyStatus | null
  surveySubmitted: boolean
  recommendations: TopDestination[] | null
  voteCounts: VoteCount[]
  myVote: string | null
  loading: boolean
  error: string | null

  submitSurvey: (groupId: string, budget: string, vibe: string, pace: string) => Promise<void>
  loadSurveyStatus: (groupId: string) => Promise<void>
  generateRecommendations: (groupId: string) => Promise<void>
  loadRecommendations: (groupId: string) => Promise<void>
  castVote: (groupId: string, destinationId: string) => Promise<void>
  loadVotes: (groupId: string) => Promise<void>
  updateVoteCounts: (counts: VoteCount[]) => void
  resetForGroup: () => void
  clearError: () => void
}

export const useConsensusStore = create<ConsensusStore>((set) => ({
  surveyStatus: null,
  surveySubmitted: false,
  recommendations: null,
  voteCounts: [],
  myVote: null,
  loading: false,
  error: null,

  submitSurvey: async (groupId, budget, vibe, pace) => {
    set({ loading: true, error: null })
    try {
      await submitSurveyApi(groupId, budget, vibe, pace)
      set({ surveySubmitted: true, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit survey'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  loadSurveyStatus: async (groupId) => {
    set({ loading: true, error: null })
    try {
      const res = await getSurveyStatusApi(groupId)
      set({ surveyStatus: res.data.data, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load survey status'
      set({ error: msg, loading: false })
    }
  },

  generateRecommendations: async (groupId) => {
    set({ loading: true, error: null })
    try {
      const res = await generateRecommendationsApi(groupId)
      set({ recommendations: res.data.data.topDestinations, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate recommendations'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  loadRecommendations: async (groupId) => {
    set({ loading: true, error: null })
    try {
      const res = await getRecommendationsApi(groupId)
      set({ recommendations: res.data.data.topDestinations, loading: false })
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status !== 404) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load recommendations'
        set({ error: msg })
      }
      set({ loading: false })
    }
  },

  castVote: async (groupId, destinationId) => {
    set({ loading: true, error: null })
    try {
      await castVoteApi(groupId, destinationId)
      set({ myVote: destinationId, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cast vote'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  loadVotes: async (groupId) => {
    set({ loading: true, error: null })
    try {
      const res = await getVotesApi(groupId)
      const { voteCounts, myVote } = res.data.data
      set({ voteCounts, myVote: myVote ? myVote.toString() : null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateVoteCounts: (counts) => set({ voteCounts: counts }),

  resetForGroup: () => set({
    surveyStatus: null,
    surveySubmitted: false,
    recommendations: null,
    voteCounts: [],
    myVote: null,
    error: null,
  }),

  clearError: () => set({ error: null }),
}))
