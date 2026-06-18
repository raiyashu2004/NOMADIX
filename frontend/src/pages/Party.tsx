import { useEffect, useState } from "react"
import { usePartyStore } from "../store/party"
import { useItineraryStore } from "../store/itinerary"
import { useChatStore } from "../store/chat"
import { useConsensusStore } from "../store/consensus"
import { getSocket } from "../socket"

import ItineraryTimeline from "../components/ItineraryTimeline"
import BillSplit from "../components/BillSplit"
import GroupChat from "../components/GroupChat"
import SharedGallery from "../components/SharedGallery"
import ItineraryMap from "../components/ItineraryMap"
import PartyMembers from "../components/PartyMembers"
import { ErrorBoundary } from "../components/ErrorBoundary"

type EventType = "userJoined" | "voteUpdated" | "journeyStarted" | "itineraryUpdated" | "newMessage"
type LiveEvent = { type: EventType; payload?: unknown }

export default function Party() {
  const { currentGroup, party } = usePartyStore()
  const { handleSocketUpdate: handleItinerarySocket } = useItineraryStore()
  const { handleSocketMessage } = useChatStore()
  const { recommendations, loadRecommendations, loadVotes } = useConsensusStore()

  const [events, setEvents] = useState<LiveEvent[]>([])
  const [mapItems, setMapItems] = useState<Array<{ id: string; title: string; location: string; lat?: number; lng?: number }>>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'expenses' | 'gallery'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchingMap, setIsSearchingMap] = useState(false)

  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      const topDest = recommendations[0].destination
      if (!topDest) return

      const query = `${topDest.name}, ${topDest.country}`
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setMapItems([{
              id: topDest._id,
              title: topDest.name,
              location: topDest.country,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            }])
          }
        })
        .catch(err => console.error("Geocoding error:", err))
    }
  }, [recommendations])

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
      setEvents(prev => [{ type: "itineraryUpdated", payload: data }, ...prev].slice(0, 10))
    }

    const onNewMessage = (data: any) => {
      handleSocketMessage(data)
      setEvents(prev => [{ type: "newMessage", payload: data }, ...prev].slice(0, 10))
    }

    socket.on('itinerary_updated', onItineraryUpdated)
    socket.on('new_message', onNewMessage)

    return () => {
      socket.off('itinerary_updated', onItineraryUpdated)
      socket.off('new_message', onNewMessage)
    }
  }, [currentGroup?._id])

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !recommendations || recommendations.length === 0) return
    const topDest = recommendations[0].destination
    if (!topDest) return

    setIsSearchingMap(true)
    const query = `${searchQuery.trim()} in ${topDest.name}`
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`)
      const data = await res.json()
      
      if (data && data.length > 0) {
        const newItems = data.map((place: any, idx: number) => ({
          id: `search-${idx}-${place.place_id}`,
          title: place.name || searchQuery,
          location: place.display_name,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        }))
        
        const baseItems = mapItems.length > 0 ? [mapItems[0]] : []
        setMapItems([...baseItems, ...newItems])
      }
    } catch (err) {
      console.error("Geocoding search error:", err)
    } finally {
      setIsSearchingMap(false)
    }
  }

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

  const tabs = ['overview', 'chat', 'expenses', 'gallery'] as const

  return (
    <div className="flex h-[calc(100vh-73px)] bg-background">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-border p-6 flex flex-col shrink-0 bg-card overflow-y-auto hidden md:flex z-10 shadow-sm relative">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">Party</h1>
          <div className="text-xs text-muted mt-1 font-medium">Status: {party?.status || currentGroup?.currentPhase}</div>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-muted hover:bg-background hover:text-text'
              }`}
            >
              {tab === 'overview' && '📍 '}
              {tab === 'chat' && '💬 '}
              {tab === 'expenses' && '💸 '}
              {tab === 'gallery' && '📸 '}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-background/50 flex flex-col">
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col p-6 w-full h-full">
            <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <GroupChat />
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 w-full">
            {activeTab === 'overview' && (
              <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-8">
                  <div className="p-6 border shadow-sm bg-card border-border rounded-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-primary">Interactive Map</h2>
                      <form onSubmit={handleMapSearch} className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Search nearby (Museums)..." 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="px-3 py-1.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary w-48"
                        />
                        <button type="submit" disabled={isSearchingMap} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors">
                          {isSearchingMap ? '...' : 'Search'}
                        </button>
                      </form>
                    </div>
                    <div className="flex-1 min-h-[400px]">
                      <ErrorBoundary name="ItineraryMap">
                        <ItineraryMap items={mapItems} />
                      </ErrorBoundary>
                    </div>
                  </div>
                  
                  <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
                    <h2 className="mb-4 text-lg font-semibold text-primary">Itinerary</h2>
                    <ItineraryTimeline />
                  </div>
                </div>

                <div className="space-y-8">
                  <ErrorBoundary name="PartyMembers">
                    <PartyMembers />
                  </ErrorBoundary>
                  <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-primary">Live Events</h2>
                      <span className="text-xs text-muted">Auto updating</span>
                    </div>
                    <ul className="space-y-2">
                      {events.length === 0 ? <li className="text-sm text-muted">Waiting for events...</li> : events.map((event, index) => (
                        <li key={index} className="flex items-center justify-between p-3 text-sm border bg-background border-border rounded-xl">
                          <span className="text-text max-w-[200px] truncate" title={event.type}>
                            {event.type === 'itineraryUpdated' && event.payload 
                              ? (event.payload as any).action === 'add' 
                                ? `${(event.payload as any).item?.addedBy?.name || 'Someone'} added "${(event.payload as any).item?.title || 'an item'}"` 
                                : `Someone removed an itinerary item`
                              : event.type === 'newMessage' && event.payload
                              ? `${(event.payload as any).senderId?.name || 'Someone'}: "${(event.payload as any).text?.substring(0, 20) || '...'}"`
                              : event.type.replace(/([A-Z])/g, ' $1').trim()
                            }
                          </span>
                          <span className="text-xs text-muted shrink-0 ml-2">just now</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
                <h2 className="mb-4 text-lg font-semibold text-primary">Expense Split</h2>
                <BillSplit />
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-primary">Trip Gallery</h2>
                  <span className="text-sm text-muted">Shared Memories</span>
                </div>
                <ErrorBoundary name="SharedGallery">
                  <SharedGallery />
                </ErrorBoundary>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}