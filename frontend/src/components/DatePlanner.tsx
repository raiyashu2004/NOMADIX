import { useState, useEffect, useMemo } from 'react'
import { useAvailabilityStore } from '../store/availability'
import { usePartyStore } from '../store/party'
import { useAuthStore } from '../store/auth'

export default function DatePlanner() {
  const { currentGroup } = usePartyStore()
  const { user } = useAuthStore()
  const { availabilities, loading, error, updateAvailability } = useAvailabilityStore()

  // Generate next 30 days starting from today
  const [days, setDays] = useState<string[]>([])
  
  useEffect(() => {
    const arr = []
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      arr.push(d.toISOString().split('T')[0])
    }
    setDays(arr)
  }, [])

  const myAvailability = availabilities.find(a => a.userId === user?.id)?.availableDates || []
  
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  useEffect(() => {
    setSelectedDates(myAvailability)
  }, [myAvailability.length]) // simplistic sync

  const toggleDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  const handleSave = async () => {
    if (currentGroup) {
      await updateAvailability(currentGroup._id, selectedDates)
    }
  }

  // Calculate heatmap
  const heatmap = useMemo(() => {
    const map: Record<string, string[]> = {}
    days.forEach(d => map[d] = [])
    availabilities.forEach(a => {
      a.availableDates.forEach(d => {
        if (map[d]) map[d].push(a.name)
      })
    })
    return map
  }, [availabilities, days])

  const totalMembers = currentGroup?.members.length || 1

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Selection Calendar */}
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">🗓️ Select Your Available Dates</h3>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white transition bg-primary rounded-xl hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Dates'}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['S','M','T','W','T','F','S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-semibold text-muted pb-2">{day}</div>
            ))}
            {days.map(date => {
              const d = new Date(date)
              const isSelected = selectedDates.includes(date)
              // Handle offset for first day
              const offset = d.getDay()
              return (
                <button
                  key={date}
                  onClick={() => toggleDate(date)}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm transition ${
                    isSelected 
                      ? 'bg-accent text-white font-bold' 
                      : 'bg-background hover:bg-border text-text'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Heatmap */}
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <h3 className="text-lg font-semibold text-primary mb-4">🔥 Group Availability</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {days.map(date => {
              const usersAvailable = heatmap[date] || []
              if (usersAvailable.length === 0) return null
              
              const pct = usersAvailable.length / totalMembers
              
              let bgColor = 'bg-green-100 text-green-800'
              if (pct === 1) bgColor = 'bg-green-500 text-white shadow-sm'
              else if (pct >= 0.5) bgColor = 'bg-green-300 text-green-900'

              return (
                <div key={date} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-muted">
                    {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                  </div>
                  <div className={`flex-1 p-2 rounded-xl text-sm ${bgColor} transition`}>
                    <div className="font-semibold">{usersAvailable.length} / {totalMembers} available</div>
                    <div className="text-xs opacity-80">{usersAvailable.join(', ')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
