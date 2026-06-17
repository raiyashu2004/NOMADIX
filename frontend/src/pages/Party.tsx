import { useEffect, useState, useMemo } from "react"
import { usePartyStore } from "../store/party"
import { useItineraryStore } from "../store/itinerary"
import { useChatStore } from "../store/chat"
import { useConsensusStore } from "../store/consensus"
import { getSocket } from "../socket"

import VotingProgress from "../components/VotingProgress"
import ItineraryTimeline from "../components/ItineraryTimeline"
import BillSplit from "../components/BillSplit"
import GroupChat from "../components/GroupChat"
import SharedGallery from "../components/SharedGallery"
import ItineraryMap from "../components/ItineraryMap"
import { ErrorBoundary } from "../components/ErrorBoundary"

type EventType = "userJoined" | "voteUpdated" | "journeyStarted" | "itineraryUpdated" | "newMessage"
type LiveEvent = { type: EventType; payload?: unknown }

export default function Party() {
  const { currentGroup, party } = usePartyStore()
  const { handleSocketUpdate: handleItinerarySocket } = useItineraryStore()
  const { handleSocketMessage } = useChatStore()
  const { recommendations, voteCounts, loadRecommendations, loadVotes } = useConsensusStore()

  const [events, setEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    if (currentGroup) {
      loadRecommendations(currentGroup._id)
      loadVotes(currentGroup._id)
    }
  }, [currentGroup?._id])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !currentGroup) return

    const onItineraryUpdated = (data: any) => {
      handleItinerarySocket(data)
      setEvents(prev => [{ type: "itineraryUpdated" }, ...prev].slice(0, 10))
    }

    const onNewMessage = (data: any) => {
      handleSocketMessage(data)
      // Optional: add to live events, but usually chat is enough
    }

    socket.on('itinerary_updated', onItineraryUpdated)
    socket.on('new_message', onNewMessage)

    return () => {
      socket.off('itinerary_updated', onItineraryUpdated)
      socket.off('new_message', onNewMessage)
    }
  }, [currentGroup?._id])

  const transformedVote = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return null
    const validRecs = recommendations.filter(r => r.destination)
    if (validRecs.length === 0) return null
    return {
      options: validRecs.map(r => ({ id: r.destination._id, label: r.destination.name })),
      votes: voteCounts.flatMap(vc => Array(vc.count).fill({ optionId: vc.destinationId }))
    }
  }, [recommendations, voteCounts])

  if (!currentGroup && !party) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="text-6xl mb-4">🏝️</div>
        <h2 className="text-2xl font-bold text-primary mb-2">No Active Trip Selected</h2>
        <p className="text-muted max-w-md mb-6">
          You haven't selected a group to view. Head over to the Dashboard to select an active trip or create a new one!
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition shadow-sm"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl p-6 mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Party Dashboard</h1>
          <div className="text-sm text-muted">Status: {party?.status || currentGroup?.currentPhase}</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Main Content Area */}
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
                <h2 className="mb-4 text-lg font-semibold text-primary">Voting Progress</h2>
                {!transformedVote ? (
                  <div className="text-sm text-muted">No votes available. (Go to Consensus planner)</div>
                ) : (
                  <ErrorBoundary name="VotingProgress">
                    <VotingProgress vote={transformedVote} />
                  </ErrorBoundary>
                )}
              </div>

              <div className="p-6 border shadow-sm bg-card border-border rounded-2xl flex flex-col">
                <h2 className="mb-4 text-lg font-semibold text-primary">Interactive Map</h2>
                <div className="flex-1 min-h-[400px]">
                  <ErrorBoundary name="ItineraryMap">
                    <ItineraryMap items={[]} />
                  </ErrorBoundary>
                </div>
              </div>
            </div>

            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <h2 className="mb-4 text-lg font-semibold text-primary">Itinerary</h2>
              <ItineraryTimeline />
            </div>

            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <h2 className="mb-4 text-lg font-semibold text-primary">Expense Split</h2>
              <BillSplit />
            </div>

            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Trip Gallery</h2>
                <span className="text-sm text-muted">Shared Memories</span>
              </div>
              <ErrorBoundary name="SharedGallery">
                <SharedGallery />
              </ErrorBoundary>
            </div>
          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-8">
            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Group Chat</h2>
              </div>
              <GroupChat />
            </div>
            
            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Live Events</h2>
                <span className="text-xs text-muted">Auto updating</span>
              </div>
              <ul className="space-y-2">
                {events.length === 0 ? <li className="text-sm text-muted">Waiting for events...</li> : events.map((event, index) => (
                  <li key={index} className="flex items-center justify-between p-3 text-sm border bg-background border-border rounded-xl">
                    <span className="capitalize text-text">{event.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-xs text-muted">just now</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}