import { create } from "zustand"

/* =========================
   Types
========================= */

type Member = {
  id: string
  name: string
}

type VoteOption = {
  id: string
  label: string
}

type VoteEntry = {
  optionId: string
  weight?: number
}

type Vote = {
  id: string
  type: string
  options: VoteOption[]
  votes: VoteEntry[]
}

type Journey = {
  status: "not_started" | "in_progress" | "completed"
}

type Party = {
  id: string
  name: string
  status: "planning" | "active"
  members: Member[]
}

type PartyStore = {
  party: Party | null
  votes: Vote[]
  journey: Journey | null

  createParty: (name: string) => void
  joinParty: (id: string, inviteCode: string) => void
  addMember: (name: string) => void
  listVotes: () => void
  startJourney: () => void
}

/* =========================
   Store
========================= */

export const usePartyStore = create<PartyStore>((set) => ({
  party: null,
  votes: [],
  journey: null,

  createParty: (name) =>
    set({
      party: {
        id: Date.now().toString(),
        name,
        status: "planning",
        members: [],
      },
      votes: [],
      journey: null,
    }),

joinParty: (id) =>
  set({
    party: {
      id,
      name: "Joined Party",
      status: "planning",
      members: [],
    },
    votes: [],        // <-- ADD THIS
    journey: null,    // <-- ADD THIS
  }),

  addMember: (name) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            members: [
              ...state.party.members,
              { id: Date.now().toString(), name },
            ],
          }
        : null,
    })),

  listVotes: () =>
    set({
      votes: [
        {
          id: "v1",
          type: "Restaurant",
          options: [
            { id: "o1", label: "Italian" },
            { id: "o2", label: "Chinese" },
          ],
          votes: [
            { optionId: "o1" },
            { optionId: "o1" },
            { optionId: "o2" },
          ],
        },
        {
          id: "v2",
          type: "Transport",
          options: [
            { id: "o3", label: "Bus" },
            { id: "o4", label: "Train" },
          ],
          votes: [
            { optionId: "o4" },
            { optionId: "o4" },
          ],
        },
      ],
    }),

  startJourney: () =>
    set((state) => ({
      party: state.party
        ? { ...state.party, status: "active" }
        : null,
      journey: { status: "in_progress" },
    })),
}))