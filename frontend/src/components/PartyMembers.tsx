import { useState } from 'react'
import { usePartyStore } from '../store/party'
import { useAuthStore } from '../store/auth'
import { isOwner, isAdmin, canManageMembers } from '../utils/roles'
import {
  promoteAdminApi,
  demoteAdminApi,
  removeMemberApi,
  transferOwnershipApi,
  leaveGroupApi,
  deleteGroupApi,
  getGroupApi
} from '../api/groups'

export default function PartyMembers() {
  const { currentGroup, selectGroup, resetStore } = usePartyStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ action: () => Promise<any>, message: string } | null>(null)

  if (!currentGroup || !user) return null

  const _isOwner = isOwner(currentGroup, user.id)
  const _isAdmin = isAdmin(currentGroup, user.id)
  const _canManage = canManageMembers(currentGroup, user.id)

  const reloadGroup = async () => {
    try {
      const res = await getGroupApi(currentGroup._id)
      selectGroup(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAction = async (action: () => Promise<any>) => {
    setLoading(true)
    setError(null)
    try {
      await action()
      await reloadGroup()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (_isOwner) {
      setError('Owner must transfer ownership before leaving.')
      return
    }
    setConfirmAction({
      message: 'Are you sure you want to leave this party?',
      action: async () => {
        await leaveGroupApi(currentGroup._id)
        resetStore()
        window.location.href = '/'
      }
    })
  }
  const handleDelete = async () => {
    setConfirmAction({
      message: 'Are you sure you want to delete this party? This cannot be undone.',
      action: async () => {
        await deleteGroupApi(currentGroup._id)
        resetStore()
        window.location.href = '/'
      }
    })
  }

  return (
    <>
      {/* Custom Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 border shadow-xl bg-background rounded-2xl border-border">
            <h3 className="mb-2 text-lg font-semibold text-text">Confirm Action</h3>
            <p className="mb-6 text-sm text-muted">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-text"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleAction(confirmAction.action)
                  setConfirmAction(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary">Party Members</h2>
        <div className="flex gap-2">
          <button onClick={handleLeave} className="text-xs text-red-500 hover:underline">Leave Party</button>
          {_isOwner && (
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Delete Party</button>
          )}
        </div>
      </div>

      {error && <div className="mb-3 text-xs text-red-500">{error}</div>}

      <div className="space-y-3">
        {currentGroup.members.map(member => {
          const memberIsOwner = isOwner(currentGroup, member._id)
          const memberIsAdmin = isAdmin(currentGroup, member._id)
          const isMe = member._id === user.id

          return (
            <div key={member._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-xl bg-background border-border">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text truncate">{member.name} {isMe && '(You)'}</span>
                  {memberIsOwner && <span className="px-2 py-0.5 text-[10px] uppercase font-bold text-yellow-700 bg-yellow-100 rounded-full whitespace-nowrap">Owner</span>}
                  {memberIsAdmin && <span className="px-2 py-0.5 text-[10px] uppercase font-bold text-blue-700 bg-blue-100 rounded-full whitespace-nowrap">Admin</span>}
                </div>
                <div className="text-xs text-muted truncate">{member.email}</div>
              </div>

              {!isMe && (
                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
                  {_isOwner && !memberIsOwner && !memberIsAdmin && (
                    <button 
                      onClick={() => handleAction(() => promoteAdminApi(currentGroup._id, member._id))}
                      disabled={loading}
                      className="text-[10px] font-medium text-blue-500 hover:underline"
                    >
                      Promote to Admin
                    </button>
                  )}
                  {_isOwner && memberIsAdmin && (
                    <button 
                      onClick={() => handleAction(() => demoteAdminApi(currentGroup._id, member._id))}
                      disabled={loading}
                      className="text-[10px] font-medium text-orange-500 hover:underline"
                    >
                      Demote Admin
                    </button>
                  )}
                  {_isOwner && !memberIsOwner && (
                    <button 
                      onClick={() => handleAction(() => transferOwnershipApi(currentGroup._id, member._id))}
                      disabled={loading}
                      className="text-[10px] font-medium text-purple-500 hover:underline"
                    >
                      Transfer Ownership
                    </button>
                  )}
                  {_canManage && !memberIsOwner && (!memberIsAdmin || _isOwner) && (
                    <button 
                      onClick={() => {
                        setConfirmAction({
                          message: `Remove ${member.name} from the party?`,
                          action: () => removeMemberApi(currentGroup._id, member._id)
                        })
                      }}
                      disabled={loading}
                      className="text-[10px] font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
