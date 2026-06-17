import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartyStore } from '../store/party'
import { useAuthStore } from '../store/auth'
import { useConsensusStore } from '../store/consensus'
import type { Group } from '../store/party'

export default function Dashboard() {
  const { currentGroup, myGroups, loading, error, createGroup, joinGroup, loadMyGroups, selectGroup } = usePartyStore()
  const user = useAuthStore((s) => s.user)
  const resetConsensus = useConsensusStore((s) => s.resetForGroup)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (user) loadMyGroups()
  }, [user])

  const createClick = async () => {
    if (!name.trim()) return setFormError('Enter a group name')
    setFormError('')
    try {
      await createGroup(name.trim())
      setName('')
    } catch (e: unknown) {
      setFormError((e as Error).message)
    }
  }

  const joinClick = async () => {
    if (!inviteCode.trim()) return setFormError('Enter an invite code')
    setFormError('')
    try {
      await joinGroup(inviteCode.trim().toUpperCase())
      setInviteCode('')
    } catch (e: unknown) {
      setFormError((e as Error).message)
    }
  }

  const handleSelectGroup = (group: Group) => {
    selectGroup(group)
    resetConsensus()
  }

  const goToConsensus = () => {
    if (currentGroup) navigate('/consensus')
  }

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background">

      {/* Create Group */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <div className="mb-4 text-lg font-semibold text-primary">
          Welcome, {user?.name ?? 'Guest'} 👋
        </div>

        {(formError || error) && (
          <div className="px-4 py-2 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {formError || error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createClick()}
          />
          <button
            className="px-5 py-3 text-white transition rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60"
            onClick={createClick}
            disabled={loading}
          >
            {loading ? '…' : 'Create Group'}
          </button>
        </div>
      </div>

      {/* Join Group */}
      <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
        <div className="mb-4 text-lg font-semibold text-primary">Join Group</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Invite Code (e.g. A1B2C3)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinClick()}
          />
          <button
            className="px-5 py-3 text-white transition rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60"
            onClick={joinClick}
            disabled={loading}
          >
            {loading ? '…' : 'Join'}
          </button>
        </div>
      </div>

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <div className="mb-4 text-lg font-semibold text-primary">My Groups</div>
          <div className="space-y-2">
            {myGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => handleSelectGroup(group)}
                className={`w-full flex items-center justify-between p-4 border rounded-xl transition text-left ${
                  currentGroup?._id === group._id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-background'
                }`}
              >
                <div>
                  <div className="font-medium text-text">{group.name}</div>
                  <div className="text-sm text-muted">
                    Phase: {group.currentPhase} · {group.members.length} member{group.members.length !== 1 ? 's' : ''} · Code: {group.inviteCode}
                  </div>
                </div>
                {currentGroup?._id === group._id && (
                  <span className="text-xs px-2 py-1 bg-primary text-white rounded-lg">Selected</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Group Actions */}
      {currentGroup && (
        <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
          <div className="mb-3 text-xl font-semibold text-primary">{currentGroup.name}</div>
          <div className="text-sm text-muted mb-4">
            Invite Code: <span className="font-mono font-bold text-text">{currentGroup.inviteCode}</span>
          </div>
          <button
            onClick={goToConsensus}
            className="px-6 py-3 text-white font-medium transition rounded-xl bg-accent hover:opacity-90"
          >
            🗺️ Open Consensus Planner
          </button>
        </div>
      )}
    </div>
  )
}
