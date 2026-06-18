import { useEffect, useRef, useState } from 'react'
import { useMemoryStore } from '../store/memory'
import { usePartyStore } from '../store/party'
import { useAuthStore } from '../store/auth'

export default function SharedGallery() {
  const { currentGroup } = usePartyStore()
  const { user } = useAuthStore()
  const { memories, loading, uploading, error, loadMemories, uploadMemory, deleteMemory, clearError } = useMemoryStore()
  
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentGroup) {
      loadMemories(currentGroup._id)
    }
  }, [currentGroup?._id])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentGroup) return

    try {
      await uploadMemory(currentGroup._id, file, caption)
      setCaption('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch {
      // Error handled by store
    }
  }

  const handleDelete = async (memoryId: string) => {
    if (confirm('Are you sure you want to delete this photo?')) {
      await deleteMemory(memoryId)
    }
  }

  if (!currentGroup) return null

  const isOwner = typeof currentGroup.owner === 'string'
    ? currentGroup.owner === user?.id
    : (currentGroup.owner as { _id: string })?._id === user?.id

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Upload Section */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text mb-1">Add a Photo</label>
          <input
            type="text"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-background text-text border-border"
          />
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-2 h-[42px] font-medium text-white bg-primary rounded-xl hover:opacity-90 disabled:opacity-50 transition"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading && memories.length === 0 ? (
        <div className="text-center text-muted py-8">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-background/50">
          <div className="text-4xl mb-3">📸</div>
          <p className="text-text font-medium">No photos yet</p>
          <p className="text-sm text-muted mt-1">Be the first to share a memory from the trip!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {memories.map(memory => {
            const canDelete = isOwner || memory.uploadedBy._id === user?.id
            
            // Construct the full URL for the image
            const API_URL = import.meta.env.VITE_API_URL || ''
            // If the imageUrl starts with /uploads, prepend the backend host (VITE_API_URL handles proxy, but for src= we might need the actual server URL if not proxying static files)
            // Actually, Vite proxies `/uploads` if configured, otherwise we can just use the relative path if running on same domain, but local dev usually proxies `/api` only.
            // Let's use the current window origin + memory.imageUrl for now, but we need to ensure Vite proxies `/uploads` too!
            
            return (
              <div key={memory._id} className="relative group rounded-xl overflow-hidden bg-background border border-border shadow-sm">
                <img 
                  src={memory.imageUrl} 
                  alt={memory.caption || 'Memory'} 
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="flex justify-end">
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(memory._id)}
                        className="bg-white/20 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition"
                        title="Delete photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="text-white">
                    {memory.caption && <p className="text-sm font-medium mb-1 drop-shadow-md">{memory.caption}</p>}
                    <p className="text-xs text-white/80 drop-shadow-md">Added by {memory.uploadedBy.name.split(' ')[0]}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
