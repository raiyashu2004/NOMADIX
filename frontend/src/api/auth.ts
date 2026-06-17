import apiClient from './client'

export const loginApi = (email: string, password: string) =>
  apiClient.post('/api/auth/login', { email, password })

export const registerApi = (name: string, email: string, password: string) =>
  apiClient.post('/api/auth/register', { name, email, password })

export const logoutApi = () => apiClient.post('/api/auth/logout')

export const getMeApi = () => apiClient.get('/api/auth/me')
