import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
