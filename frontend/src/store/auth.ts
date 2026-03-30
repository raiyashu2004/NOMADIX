import { create } from 'zustand'
import { loginApi, registerApi, logoutApi } from '../api/auth'
import { connectSocket, disconnectSocket } from '../socket'

type User = {
  id: string
  name: string
  email: string
}

type AuthStore = {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await loginApi(email, password)
      const { user, accessToken } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      connectSocket(accessToken)
      set({ user: { id: user._id, name: user.name, email: user.email }, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed'
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
    set({ user: null, error: null })
  },

  setUser: (user) => set({ user }),
}))