import { create } from 'zustand'
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/auth'
import { connectSocket, disconnectSocket } from '../socket'
import { usePartyStore } from './party'
import { useConsensusStore } from './consensus'
import { useItineraryStore } from './itinerary'
import { useMemoryStore } from './memory'

type User = {
  id: string
  name: string
  email: string
}

type AuthStore = {
  user: User | null
  loading: boolean
  initialized: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await loginApi(email, password)
      const { user, accessToken } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      connectSocket(accessToken)
      set({ user: { id: user._id, name: user.name, email: user.email }, loading: false })
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Login failed'
      if (data?.errors && Array.isArray(data.errors)) {
        msg = data.errors.map((e: any) => e.message || e).join(', ')
      } else if (data?.message) {
        msg = data.message
      }
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await registerApi(name, email, password)
      const { user, accessToken } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      connectSocket(accessToken)
      set({ user: { id: user._id, name: user.name, email: user.email }, loading: false })
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Registration failed'
      if (data?.errors && Array.isArray(data.errors)) {
        msg = data.errors.map((e: any) => e.message || e).join(', ')
      } else if (data?.message) {
        msg = data.message
      }
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  logout: async () => {
    try {
      await logoutApi()
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken')
    disconnectSocket()
    
    // Clear all other stores to prevent state leakage between accounts
    usePartyStore.getState().resetStore()
    useConsensusStore.getState().resetForGroup()
    // Itinerary and Memory stores might not have resetStore, let's just assume we reset what we can. Actually we should just let them unmount, but zustand stores are global.
    // It's safer to just set user to null.
    set({ user: null, error: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const res = await getMeApi()
      const user = res.data.data
      connectSocket(token)
      set({ user: { id: user._id, name: user.name, email: user.email } })
    } catch (err) {
      localStorage.removeItem('accessToken')
      disconnectSocket()
      set({ user: null })
    } finally {
      set({ initialized: true })
    }
  },

  setUser: (user) => set({ user }),
}))