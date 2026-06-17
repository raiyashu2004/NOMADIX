import { create } from 'zustand'
import { getMemoriesApi, uploadMemoryApi, deleteMemoryApi } from '../api/memories'

export type Memory = {
  _id: string
  groupId: string
  uploadedBy: { _id: string; name: string; email: string }
  imageUrl: string
  caption: string
  createdAt: string
}

type MemoryStore = {
  memories: Memory[]
  loading: boolean
  uploading: boolean
  error: string | null
  loadMemories: (groupId: string) => Promise<void>
  uploadMemory: (groupId: string, file: File, caption?: string) => Promise<void>
  deleteMemory: (memoryId: string) => Promise<void>
  clearError: () => void
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories: [],
  loading: false,
  uploading: false,
  error: null,

  loadMemories: async (groupId) => {
    set({ loading: true, error: null })
    try {
      const res = await getMemoriesApi(groupId)
      set({ memories: res.data?.data || [], loading: false })
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load memories'
      set({ error: msg, loading: false })
    }
  },

  uploadMemory: async (groupId, file, caption) => {
    set({ uploading: true, error: null })
    try {
      const res = await uploadMemoryApi(groupId, file, caption)
      // Prepend the new memory to the top of the list
      set(state => ({
        memories: [res.data.data, ...state.memories],
        uploading: false
      }))
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload image'
      set({ error: msg, uploading: false })
      throw new Error(msg)
    }
  },

  deleteMemory: async (memoryId) => {
    try {
      await deleteMemoryApi(memoryId)
      set(state => ({
        memories: state.memories.filter(m => m._id !== memoryId)
      }))
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete image'
      set({ error: msg })
    }
  },

  clearError: () => set({ error: null })
}))
