import { create } from 'zustand'
import api from '../api/client'

export interface Bill {
  _id: string
  group: string
  description: string
  totalAmount: number
  paidBy: { _id: string; name: string }
  splitAmong: { _id: string; name: string }[]
  createdAt: string
}

export interface Settlement {
  from: { _id: string; name: string }
  to: { _id: string; name: string }
  amount: number
}

interface ExpenseState {
  bills: Bill[]
  settlements: Settlement[]
  loading: boolean
  error: string | null
  
  loadBills: (groupId: string) => Promise<void>
  loadSettlements: (groupId: string) => Promise<void>
  addBill: (groupId: string, description: string, totalAmount: number, paidBy: string, splitAmong: string[]) => Promise<void>
  deleteBill: (billId: string) => Promise<void>
  clearError: () => void
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  bills: [],
  settlements: [],
  loading: false,
  error: null,

  loadBills: async (groupId: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get(`/api/bills/group/${groupId}`)
      set({ bills: res.data.data.bills || [], loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load bills', loading: false })
    }
  },

  loadSettlements: async (groupId: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get(`/api/bills/group/${groupId}/summary`)
      set({ settlements: res.data.data.settlements || [], loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load settlements', loading: false })
    }
  },

  addBill: async (groupId, description, totalAmount, paidBy, splitAmong) => {
    set({ loading: true, error: null })
    try {
      await api.post('/api/bills', {
        groupId,
        description,
        totalAmount,
        paidBy,
        splitAmong
      })
      // Reload bills and settlements after adding
      await get().loadBills(groupId)
      await get().loadSettlements(groupId)
      set({ loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to add bill', loading: false })
      throw e
    }
  },

  deleteBill: async (billId: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/api/bills/${billId}`)
      set({ loading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to delete bill', loading: false })
      throw e
    }
  },

  clearError: () => set({ error: null })
}))
