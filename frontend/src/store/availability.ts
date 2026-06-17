import { create } from 'zustand'
import api from '../api/client'

export type Availability = {
  userId: string
  name: string
  availableDates: string[]
}

type AvailabilityStore = {
  availabilities: Availability[]
  loading: boolean
  error: string | null
  
  loadAvailability: (groupId: string) => Promise<void>
  updateAvailability: (groupId: string, availableDates: string[]) => Promise<void>
  handleSocketUpdate: (data: { userId: string, userName: string, availableDates: string[] }) => void
}

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  availabilities: [],
  loading: false,
  error: null,

  loadAvailability: async (groupId: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/api/groups/${groupId}/availability`)
      set({ availabilities: data.data, loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load availability', loading: false })
    }
  },

  updateAvailability: async (groupId: string, availableDates: string[]) => {
    set({ loading: true, error: null })
    try {
      await api.post(`/api/groups/${groupId}/availability`, { availableDates })
      // Reload or rely on socket
      await get().loadAvailability(groupId)
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to update availability', loading: false })
      throw e
    }
  },

  handleSocketUpdate: (data) => {
    set((state) => {
      const newAvailabilities = [...state.availabilities]
      const index = newAvailabilities.findIndex(a => a.userId === data.userId)
      if (index >= 0) {
        newAvailabilities[index] = { ...newAvailabilities[index], availableDates: data.availableDates }
      } else {
        newAvailabilities.push({
          userId: data.userId,
          name: data.userName,
          availableDates: data.availableDates
        })
      }
      return { availabilities: newAvailabilities }
    })
  }
}))
