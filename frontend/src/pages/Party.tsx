import { useEffect, useState } from "react"
import { usePartyStore } from "../store/party"

import VotingProgress from "../components/VotingProgress"
import ItineraryTimeline from "../components/ItineraryTimeline"
import BillSplit from "../components/BillSplit"

/* =========================
   Types
========================= */

type EventType =
  | "userJoined"
  | "voteUpdated"
  | "journeyStarted"

type LiveEvent = {
  type: EventType
  payload?: unknown
}

export default function Party() {
  const { party, votes, listVotes } = usePartyStore()

  const [events, setEvents] = useState<LiveEvent[]>([])

  /* =========================
     Fake Live Event Generator
     (Frontend Only Simulation)
  ========================= */

  useEffect(() => {
    if (!party) return

    listVotes()

    // Simulate event feed
    const interval = setInterval(() => {
      const fakeEvents: EventType[] = [
        "userJoined",
        "voteUpdated",
        "journeyStarted",
      ]

      const random =
        fakeEvents[Math.floor(Math.random() * fakeEvents.length)]

      setEvents((prev) =>
        [{ type: random }, ...prev].slice(0, 10)
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [party])

  if (!party) {
    return (
      <div className="p-6 text-center text-gray-500">
        No active party. Create or join one first.
      </div>
    )
  }
return (
  <div className="min-h-screen bg-background">
    <div className="max-w-6xl p-6 mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">
          Party Dashboard
        </h1>

        <div className="text-sm text-muted">
          Status: {party.status}
        </div>
      </div>

      {/* Live Events */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">
            Live Events
          </h2>
          <span className="text-xs text-muted">
            Auto updating
          </span>
        </div>

        <ul className="space-y-2">
          {events.map((event, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-3 text-sm border bg-background border-border rounded-xl"
            >
              <span className="capitalize text-text">
                {event.type}
              </span>
              <span className="text-xs text-muted">
                just now
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Voting + Itinerary Grid */}
      <div className="grid gap-8 lg:grid-cols-2">

        {/* Voting */}
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Voting Progress
          </h2>

          {votes.length === 0 ? (
            <div className="text-sm text-muted">
              No votes available.
            </div>
          ) : (
            <div className="space-y-5">
              {Array.isArray(votes) &&
              votes.map((vote) =>
                vote ? <VotingProgress key={vote.id} vote={vote} /> : null
              )}
            </div>
          )}
        </div>

        {/* Itinerary */}
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Itinerary
          </h2>
          <ItineraryTimeline />
        </div>

      </div>

      {/* Bill Split Full Width */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Bill Split
        </h2>
        <BillSplit />
      </div>

    </div>
  </div>
)}