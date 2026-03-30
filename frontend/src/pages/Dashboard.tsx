import { useState } from "react"
import { usePartyStore } from "../store/party"
import { useAuthStore } from "../store/auth"

type Vote = {
  id: string
  type: string
  options: { id: string; label: string }[]
}

export default function Dashboard() {
  const {
    party,
    createParty,
    joinParty,
    listVotes,
    startJourney,
    votes,
    journey,
  } = usePartyStore()

  const user = useAuthStore((s) => s.user)

  const [name, setName] = useState("")
  const [joinId, setJoinId] = useState("")
  const [inviteCode, setInviteCode] = useState("")

  const createClick = () => {
    createParty(name || "My Trip")
    listVotes()
  }

  const joinClick = () => {
    joinParty(joinId || "demo-id", inviteCode || "1234")
    listVotes()
  }

  const startJourneyClick = () => {
    if (party) startJourney()
  }

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background">

      {/* Create Party */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <div className="mb-4 text-lg font-semibold text-primary">
          Welcome {user?.name ?? "Guest"}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Party name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button
            className="px-5 py-3 text-white transition rounded-xl bg-primary hover:bg-primary-hover"
            onClick={createClick}
          >
            Create Party
          </button>
        </div>
      </div>

      {/* Join Party */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <div className="mb-4 text-lg font-semibold text-primary">
          Join Party
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Party ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />

          <input
            className="p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />

          <button
            className="px-5 py-3 text-white transition rounded-xl bg-primary hover:bg-primary-hover"
            onClick={joinClick}
          >
            Join
          </button>
        </div>
      </div>

      {/* Party Details */}
      {party && (
        <div className="p-6 space-y-5 border shadow-sm bg-card border-border rounded-2xl">

          <div className="text-xl font-semibold text-primary">
            Party Details
          </div>

          <div className="space-y-1 text-text">
            <div>ID: {party.id}</div>
            <div>Name: {party.name}</div>
            <div>Status: {party.status}</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="px-5 py-3 text-white transition shadow-sm rounded-xl bg-accent hover:bg-accent-hover"
              onClick={startJourneyClick}
            >
              Start Journey
            </button>

            <button
              className="px-4 py-2 transition border border-border text-text rounded-xl hover:bg-background"
              onClick={() => listVotes()}
            >
              Refresh Votes
            </button>
          </div>

          {/* Votes */}
          <div className="mt-4 space-y-3">
            {votes.map((v: Vote) => (
              <div
                key={v.id}
                className="p-4 border border-border rounded-xl bg-background"
              >
                <div className="font-medium text-text">
                  Type: {v.type}
                </div>
                <div className="text-sm text-muted">
                  Options: {v.options.length}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-sm text-muted">
            Journey: {journey ? journey.status : "none"}
          </div>

        </div>
      )}
    </div>
  )
}