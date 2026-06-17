import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../store/chat"
import { usePartyStore } from "../store/party"
import { useAuthStore } from "../store/auth"

export default function GroupChat() {
  const { currentGroup } = usePartyStore()
  const { user } = useAuthStore()
  const { messages, loading, error, loadMessages, sendMessage } = useChatStore()
  const [text, setText] = useState("")
  
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentGroup) {
      loadMessages(currentGroup._id)
    }
  }, [currentGroup?._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!currentGroup) {
    return <div className="text-sm text-muted">Join a group to chat.</div>
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const msg = text
    setText("")
    try {
      await sendMessage(currentGroup._id, msg)
    } catch {
      setText(msg) // restore on fail
    }
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background rounded-t-xl border-x border-t border-border">
        {messages.length === 0 ? (
          <div className="text-sm text-center text-muted py-8">Say hello to the group! 👋</div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId?._id === user?.id
            return (
              <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-card border border-border text-text rounded-bl-none'
                }`}>
                  {!isMe && <div className="text-xs font-bold opacity-70 mb-1">{m.senderId?.name || 'Unknown User'}</div>}
                  <div className="text-sm">{m.text}</div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-card border border-border rounded-b-xl flex items-center gap-3">
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm transition bg-background border border-border rounded-full text-text focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="flex items-center justify-center w-10 h-10 text-white transition-all bg-accent rounded-full hover:bg-accent-hover disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
          title="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
