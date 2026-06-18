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
    <div className="flex flex-col h-full bg-background rounded-b-xl overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <div className="text-4xl">👋</div>
            <div className="text-sm font-medium">No messages yet. Say hello to the group!</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.senderId?._id === user?.id
            const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId?._id !== m.senderId?._id)
            const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            
            return (
              <div key={m._id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isMe && (
                    <div className="w-8 shrink-0 flex flex-col justify-end">
                      {showAvatar ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {(m.senderId?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      ) : <div className="w-8 h-8" />}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isMe && (
                      <span className="text-xs font-medium text-muted ml-1 mb-1">{m.senderId?.name || 'Unknown User'}</span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative group ${
                      isMe 
                        ? 'bg-primary text-white rounded-br-sm' 
                        : 'bg-card border border-border text-text rounded-bl-sm'
                    }`}>
                      <p className="text-[15px] leading-relaxed break-words">{m.text}</p>
                      
                      {/* Timestamp (Shows on hover or inside bubble) */}
                      <span className={`text-[10px] mt-1 block opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                        {time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSend} className="flex items-center gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-5 py-3 text-[15px] transition-all bg-background border border-border rounded-full text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm"
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="flex items-center justify-center w-12 h-12 text-white transition-all bg-primary rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 shrink-0"
            title="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
