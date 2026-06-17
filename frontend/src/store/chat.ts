import { create } from 'zustand'
import api from '../api/client'

export type ChatMessage = {
  _id: string
  groupId: string
  text: string
  senderId: { _id: string; name: string }
  createdAt: string
}

type ChatStore = {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  
  loadMessages: (groupId: string) => Promise<void>
  sendMessage: (groupId: string, text: string) => Promise<void>
  handleSocketMessage: (message: ChatMessage) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  loadMessages: async (groupId: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/api/chat/group/${groupId}`)
      set({ messages: data.data, loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load messages', loading: false })
    }
  },

  sendMessage: async (groupId: string, text: string) => {
    try {
      await api.post(`/api/chat/group/${groupId}`, { text })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to send message' })
      throw e
    }
  },

  handleSocketMessage: (message) => {
    set((state) => {
      // Prevent duplicates
      if (state.messages.find(m => m._id === message._id)) return state
      return { messages: [...state.messages, message] }
    })
  }
}))
