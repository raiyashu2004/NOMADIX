import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartyStore } from '../store/party'
import { useAuthStore } from '../store/auth'
import { useConsensusStore } from '../store/consensus'
import type { TopDestination, VoteCount } from '../store/consensus'
import { getSocket } from '../socket'

const BUDGET_OPTIONS = ['budget', 'moderate', 'luxury']
const VIBE_OPTIONS = ['adventure', 'relaxation', 'cultural', 'party', 'nature', 'city']
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'] as const
const PACE_OPTIONS = ['slow', 'moderate', 'fast']

export default function Consensus() {
  const navigate = useNavigate()
  const { currentGroup, updateGroupPhase } = usePartyStore()
  const user = useAuthStore((s) => s.user)
  const {
    surveyStatus,
    surveySubmitted,
    recommendations,
    voteCounts,
    myVote,
    loading,
    error,
    submitSurvey,
    loadSurveyStatus,
    generateRecommendations,
    loadRecommendations,
    castVote,
    loadVotes,
    updateVoteCounts,
    clearError,
  } = useConsensusStore()

  const [budget, setBudget] = useState<string>('')
  const [vibe, setVibe] = useState<string>('')
  const [pace, setPace] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'survey' | 'recommendations' | 'votes'>('survey')

  useEffect(() => {
    if (!currentGroup) {
      navigate('/')
      return
    }
    loadSurveyStatus(currentGroup._id)
    loadRecommendations(currentGroup._id)
    loadVotes(currentGroup._id)
  }, [currentGroup?._id])

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !currentGroup) return

    const onSurveySubmitted = () => {
      loadSurveyStatus(currentGroup._id)
    }
    const onRecommendationsGenerated = (data: { topDestinations: TopDestination[] }) => {
      useConsensusStore.setState({ recommendations: data.topDestinations })
      updateGroupPhase('recommendations')
      setActiveTab('recommendations')
    }
    const onVoteCast = (data: { voteCounts: VoteCount[] }) => {
      updateVoteCounts(data.voteCounts)
    }

    socket.on('survey_submitted', onSurveySubmitted)
    socket.on('recommendations_generated', onRecommendationsGenerated)
    socket.on('vote_cast', onVoteCast)

    return () => {
      socket.off('survey_submitted', onSurveySubmitted)
      socket.off('recommendations_generated', onRecommendationsGenerated)
      socket.off('vote_cast', onVoteCast)
    }
  }, [currentGroup?._id])

  if (!currentGroup) return null

  const isLeader = typeof currentGroup.leader === 'string'
    ? currentGroup.leader === user?.id
    : (currentGroup.leader as { _id: string })?._id === user?.id

  const hasResponded = surveyStatus?.respondents.some(r => r.userId === user?.id)

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budget || !vibe || !pace) return
    try {
      await submitSurvey(currentGroup._id, budget, vibe, pace)
      await loadSurveyStatus(currentGroup._id)
    } catch { /* shown in store error */ }
  }

  const handleGenerateRecs = async () => {
    try {
      await generateRecommendations(currentGroup._id)
      updateGroupPhase('recommendations')
      await loadVotes(currentGroup._id)
      setActiveTab('recommendations')
    } catch { /* shown in store error */ }
  }

  const handleVote = async (destinationId: string) => {
    try {
      await castVote(currentGroup._id, destinationId)
      await loadVotes(currentGroup._id)
      updateGroupPhase('voting')
    } catch { /* shown in store error */ }
  }

  const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0)

  return (
    <div className="min-h-screen p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{currentGroup.name}</h1>
          <p className="text-sm text-muted mt-1">
            Phase: <span className="capitalize font-medium text-text">{currentGroup.currentPhase}</span>
            {' · '}Invite: <span className="font-mono font-bold text-text">{currentGroup.inviteCode}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-3 py-2 text-sm border border-border text-muted rounded-xl hover:bg-card"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['survey', 'recommendations', 'votes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition capitalize ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-background'
            }`}
          >
            {tab === 'survey' && '📋 '}
            {tab === 'recommendations' && '🗺️ '}
            {tab === 'votes' && '🗳️ '}
            {tab}
          </button>
        ))}
      </div>

      {/* ─── SURVEY TAB ─── */}
      {activeTab === 'survey' && (
        <div className="space-y-6">
          {!hasResponded && !surveySubmitted ? (
            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <h2 className="text-lg font-semibold text-primary mb-4">📋 Your Travel Preferences</h2>
              <form onSubmit={handleSurveySubmit} className="space-y-5">
                <fieldset>
                  <legend className="text-sm font-medium text-text mb-2">💰 Budget</legend>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setBudget(opt)}
                        className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${
                          budget === opt
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-text hover:bg-background'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium text-text mb-2">✨ Vibe</legend>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVibe(opt)}
                        className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${
                          vibe === opt
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-text hover:bg-background'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium text-text mb-2">⚡ Pace</legend>
                  <div className="flex flex-wrap gap-2">
                    {PACE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPace(opt)}
                        className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${
                          pace === opt
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-text hover:bg-background'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={!budget || !vibe || !pace || loading}
                  className="w-full py-3 font-medium text-white bg-accent rounded-xl hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? 'Submitting…' : 'Submit My Preferences'}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-6 border border-green-200 bg-green-50 rounded-2xl">
              <div className="text-green-700 font-medium">✅ You've submitted your preferences!</div>
              <div className="text-sm text-green-600 mt-1">Waiting for other members to respond.</div>
            </div>
          )}

          {/* Survey Status */}
          {surveyStatus && (
            <div className="p-6 border shadow-sm bg-card border-border rounded-2xl">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Survey Progress ({surveyStatus.respondents.length}/{surveyStatus.totalMembers})
              </h2>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${surveyStatus.totalMembers > 0
                      ? (surveyStatus.respondents.length / surveyStatus.totalMembers) * 100
                      : 0}%`
                  }}
                />
              </div>

              {surveyStatus.respondents.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-text mb-2">Responded:</div>
                  <div className="flex flex-wrap gap-2">
                    {surveyStatus.respondents.map(r => (
                      <span key={r.userId} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        ✓ {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {surveyStatus.pendingMembers.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-text mb-2">Waiting for:</div>
                  <div className="flex flex-wrap gap-2">
                    {surveyStatus.pendingMembers.map(m => (
                      <span key={m.userId} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        ⏳ {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isLeader && surveyStatus.respondents.length > 0 && !recommendations && (
                <button
                  onClick={handleGenerateRecs}
                  disabled={loading}
                  className="mt-4 w-full py-3 font-medium text-white bg-primary rounded-xl hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? 'Generating…' : '🔮 Generate Top 3 Recommendations'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── RECOMMENDATIONS TAB ─── */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations ? (
            <>
              <div className="text-lg font-semibold text-primary">🗺️ Top 3 Destinations</div>
              <p className="text-sm text-muted">Based on your group's preferences</p>
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.destination._id}
                  className="p-5 border shadow-sm bg-card border-border rounded-2xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MEDAL_EMOJIS[idx] ?? '🏅'}</span>
                        <h3 className="text-xl font-bold text-text">{rec.destination.name}</h3>
                      </div>
                      <p className="text-sm text-muted mt-1">
                        {rec.destination.country}{rec.destination.region ? ` · ${rec.destination.region}` : ''}
                      </p>
                      {rec.destination.description && (
                        <p className="text-sm text-text mt-2">{rec.destination.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="text-sm font-bold text-primary">{rec.score}/3 match</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                      💰 {rec.destination.tags.budget}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full capitalize">
                      ✨ {rec.destination.tags.vibe}
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full capitalize">
                      ⚡ {rec.destination.tags.pace}
                    </span>
                  </div>

                  {rec.matchedTags.length > 0 && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Matched: {rec.matchedTags.map(t => t.replace(':', ': ')).join(' · ')}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => setActiveTab('votes')}
                className="w-full py-3 font-medium text-white bg-accent rounded-xl hover:opacity-90 transition"
              >
                🗳️ Go Vote →
              </button>
            </>
          ) : (
            <div className="p-8 text-center border shadow-sm bg-card border-border rounded-2xl">
              <div className="text-4xl mb-3">🔮</div>
              <p className="text-text font-medium">Recommendations not generated yet</p>
              <p className="text-sm text-muted mt-1">
                {isLeader
                  ? 'Go to Survey tab to generate recommendations once members have responded.'
                  : 'Waiting for the group leader to generate recommendations.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── VOTES TAB ─── */}
      {activeTab === 'votes' && (
        <div className="space-y-4">
          {recommendations ? (
            <>
              <div className="text-lg font-semibold text-primary">🗳️ Vote for Your Destination</div>
              <p className="text-sm text-muted">
                {myVote ? 'You voted! Counts update live.' : 'Select your favourite destination.'}
              </p>
              {recommendations.map((rec) => {
                const voteCount = voteCounts.find(v => v.destinationId === rec.destination._id)?.count ?? 0
                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                const isMyVote = myVote === rec.destination._id

                return (
                  <div
                    key={rec.destination._id}
                    className={`p-5 border rounded-2xl transition ${
                      isMyVote ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-text">{rec.destination.name}</h3>
                        <p className="text-sm text-muted">{rec.destination.country}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{voteCount}</div>
                        <div className="text-xs text-muted">vote{voteCount !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-accent h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted mb-3">{pct}% of votes</div>

                    <button
                      onClick={() => handleVote(rec.destination._id)}
                      disabled={isMyVote || loading}
                      className={`w-full py-2 text-sm font-medium rounded-xl transition ${
                        isMyVote
                          ? 'bg-primary/20 text-primary cursor-default'
                          : 'bg-primary text-white hover:opacity-90 disabled:opacity-50'
                      }`}
                    >
                      {isMyVote ? '✓ Your Vote' : 'Vote for This'}
                    </button>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="p-8 text-center border shadow-sm bg-card border-border rounded-2xl">
              <div className="text-4xl mb-3">🗳️</div>
              <p className="text-text font-medium">Voting opens after recommendations are generated</p>
              <button
                onClick={() => setActiveTab('recommendations')}
                className="mt-3 text-sm text-primary hover:underline"
              >
                View Recommendations →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
