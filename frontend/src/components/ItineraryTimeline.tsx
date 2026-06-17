import { useState, useEffect } from "react"
import { useItineraryStore } from "../store/itinerary"
import { usePartyStore } from "../store/party"
import { useAuthStore } from "../store/auth"

export default function ItineraryTimeline() {
  const { currentGroup } = usePartyStore()
  const { user } = useAuthStore()
  const { items, loading, error, loadItinerary, addItem, deleteItem } = useItineraryStore()

  const [title, setTitle] = useState("")
  const [day, setDay] = useState("1")
  const [time, setTime] = useState("")

  useEffect(() => {
    if (currentGroup) {
      loadItinerary(currentGroup._id)
    }
  }, [currentGroup?._id])

  if (!currentGroup) {
    return <div className="text-sm text-muted">Join a group to view itinerary.</div>
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    try {
      await addItem(currentGroup._id, title, parseInt(day) || 1, time)
      setTitle("")
      setTime("")
    } catch {
      // error handled in store
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Form */}
      <form onSubmit={handleAddItem} className="space-y-3 p-4 border shadow-sm rounded-xl border-border bg-background">
        {error && <div className="text-sm text-red-500">{error}</div>}
        <input
          type="text"
          placeholder="Activity (e.g. Visit Museum)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 text-sm transition border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Day"
            min="1"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-20 p-2 text-sm transition border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="text"
            placeholder="Time (e.g. 10:00 AM)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 p-2 text-sm transition border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !title}
          className="w-full py-2 text-sm font-medium text-white transition bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add to Itinerary"}
        </button>
      </form>

      {/* Timeline */}
      <div className="relative pt-4">
        {items.length === 0 ? (
          <div className="text-sm text-muted text-center py-4">No activities planned yet.</div>
        ) : (
          <>
            <div className="absolute top-4 left-16 h-full w-[2px] bg-border"></div>
            <div className="space-y-6">
              {items.map((it) => (
                <div key={it._id} className="relative flex items-start gap-4">
                  
                  {/* Day & Time */}
                  <div className="w-12 text-right">
                    <div className="text-xs font-bold text-primary">Day {it.day}</div>
                    <div className="text-xs font-medium text-muted">{it.time}</div>
                  </div>

                  {/* Dot */}
                  <div className="relative z-10 flex items-center justify-center w-3 h-3 mt-1 rounded-full bg-primary ring-4 ring-card"></div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-text">{it.title}</div>
                      {(it.addedBy._id === user?.id || isLeader(currentGroup, user)) && (
                        <button 
                          type="button"
                          onClick={() => deleteItem(it._id).then(() => loadItinerary(currentGroup._id))}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-1">Added by {it.addedBy.name}</div>
                  </div>

                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function isLeader(group: any, user: any) {
  if (!group || !user) return false
  return typeof group.leader === 'string'
    ? group.leader === user.id
    : group.leader?._id === user.id
}