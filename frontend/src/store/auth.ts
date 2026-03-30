import { create } from "zustand"

type User = {
  id: string
  name: string
  email: string
}

type AuthStore = {
  user: User | null
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,

  login: () =>
    set({
      user: {
        id: "1",
        name: "admin",
        email: "admin@test.com",
      },
    }),

  logout: () => set({ user: null }),
}))