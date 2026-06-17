import client from './client'

export const getMemoriesApi = (groupId: string) => {
  return client.get(`/api/memories/group/${groupId}`)
}

export const uploadMemoryApi = (groupId: string, file: File, caption?: string) => {
  const formData = new FormData()
  formData.append('image', file)
  if (caption) {
    formData.append('caption', caption)
  }

  return client.post(`/api/memories/group/${groupId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const deleteMemoryApi = (memoryId: string) => {
  return client.delete(`/api/memories/${memoryId}`)
}
