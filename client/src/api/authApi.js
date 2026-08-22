import api from './axios'

export const login = (credentials) => api.post('/auth/login', credentials)
export const register = (details) => api.post('/auth/register', details)
export const getCurrentUser = () => api.get('/auth/me')
