import { motion } from "framer-motion"

/* =========================
   Types
========================= */

type VoteOption = {
  id: string
  label: string
}

type VoteEntry = {
  optionId: string
  weight?: number
}

type Vote = {
  options: VoteOption[]
  votes: VoteEntry[]
}

type VotingProgressProps = {
  vote: Vote
}

/* =========================
   Component
========================= */
export default function VotingProgress({ vote }: VotingProgressProps) {
  if (!vote || !Array.isArray(vote.options) || !Array.isArray(vote.votes)) {
    return null
  }

  const counts = vote.options.map((option) =>
    vote.votes
      .filter((v) => v.optionId === option.id)
      .reduce((sum, v) => sum + (v.weight ?? 1), 0)
  )

  const total = counts.reduce((a, b) => a + b, 0) || 1
  const maxVotes = Math.max(...counts)

  return (
    <div className="space-y-4">
      {vote.options.map((option, index) => {
        const pct = Math.round((counts[index] / total) * 100)
        const isWinner = counts[index] === maxVotes && maxVotes > 0

        return (
          <div key={option.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-text">
                {option.label}
              </span>
              <span className="text-muted">{pct}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
                className={`h-3 rounded-full ${
                  isWinner ? "bg-accent" : "bg-primary"
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}