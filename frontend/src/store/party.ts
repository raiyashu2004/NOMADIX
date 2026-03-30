import { create } from 'zustand'
import { createGroupApi, joinGroupApi, getMyGroupsApi } from '../api/groups'
import { joinGroupRoom } from '../socket'

export type GroupMember = {
  _id: string
  name: string
  email: string
}

export type Group = {
  _id: string
  name: string
  leader: GroupMember | string
  members: GroupMember[]
  inviteCode: string
  currentPhase: 'planning' | 'survey' | 'recommendations' | 'voting' | 'locked'
}

type PartyStore = {
  currentGroup: Group | null
  myGroups: Group[]
  loading: boolean
  error: string | null
  createGroup: (name: string) => Promise<void>
  joinGroup: (inviteCode: string) => Promise<void>
  loadMyGroups: () => Promise<void>
  selectGroup: (group: Group) => void
  updateGroupPhase: (phase: Group['currentPhase']) => void
  clearError: () => void
}

export const usePartyStore = create<PartyStore>((set, get) => ({
  currentGroup: null,
  myGroups: [],
  loading: false,
  error: null,

  createGroup: async (name) => {
    set({ loading: true, error: null })
    try {
      const res = await createGroupApi(name)
      const group: Group = res.data.data
      set((state) => ({
        currentGroup: group,
        myGroups: [group, ...state.myGroups],
        loading: false,
      }))
      joinGroupRoom(group._id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create group'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  joinGroup: async (inviteCode) => {
    set({ loading: true, error: null })
    try {
      const res = await joinGroupApi(inviteCode)
      const group: Group = res.data.data
      set((state) => ({
        currentGroup: group,
        myGroups: state.myGroups.some(g => g._id === group._id)
          ? state.myGroups
          : [group, ...state.myGroups],
        loading: false,
      }))
      joinGroupRoom(group._id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to join group'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  loadMyGroups: async () => {
    set({ loading: true, error: null })
    try {
      const res = await getMyGroupsApi()
      const groups: Group[] = res.data.data.groups
      set({ myGroups: groups, loading: false })
      groups.forEach(g => joinGroupRoom(g._id))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load groups'
      set({ error: msg, loading: false })
    }
  },

  selectGroup: (group) => {
    set({ currentGroup: group })
    joinGroupRoom(group._id)
  },

  updateGroupPhase: (phase) => {
    const { currentGroup } = get()
    if (currentGroup) {
      set({ currentGroup: { ...currentGroup, currentPhase: phase } })
    }
  },

  clearError: () => set({ error: null }),
}))