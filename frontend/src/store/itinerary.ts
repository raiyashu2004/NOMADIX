import { create } from 'zustand'
import api from '../api/client'

export type ItineraryItem = {
  _id: string
  groupId: string
  title: string
  day: number
  time: string
  addedBy: { _id: string; name: string }
}

type ItineraryStore = {
  items: ItineraryItem[]
  loading: boolean
  error: string | null
  
  loadItinerary: (groupId: string) => Promise<void>
  addItem: (groupId: string, title: string, day: number, time: string) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
  handleSocketUpdate: (data: any) => void
}

export const useItineraryStore = create<ItineraryStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  loadItinerary: async (groupId: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/api/itinerary/group/${groupId}`)
      set({ items: data.data, loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load itinerary', loading: false })
    }
  },

  addItem: async (groupId: string, title: string, day: number, time: string) => {
    set({ loading: true, error: null })
    try {
      await api.post(`/api/itinerary/group/${groupId}`, { title, day, time })
      // Reload or rely on socket
      await get().loadItinerary(groupId)
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to add item', loading: false })
      throw e
    }
  },

  deleteItem: async (itemId: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/api/itinerary/${itemId}`)
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to delete item', loading: false })
      throw e
    }
  },

  handleSocketUpdate: (data) => {
    set((state) => {
      let newItems = [...state.items]
      if (data.action === 'add') {
        // Only add if not already in list
        if (!newItems.find(i => i._id === data.item._id)) {
          newItems.push(data.item)
          newItems.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
        }
      } else if (data.action === 'delete') {
        newItems = newItems.filter(i => i._id !== data.itemId)
      }
      return { items: newItems }
    })
  }
}))
