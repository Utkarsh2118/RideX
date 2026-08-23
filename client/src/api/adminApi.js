import api from './axios'

export const getAdminStats = () => api.get('/admin/stats')
export const getAdminUsers = (page = 1) => api.get(`/admin/users?page=${page}`)
export const getAdminRides = (page = 1) => api.get(`/admin/rides?page=${page}`)
export const getAdminDrivers = (status = 'pending') => api.get(`/drivers?status=${status}`)
export const reviewAdminDriver = (driverId, status, rejectionReason) => api.patch(`/drivers/${driverId}/verification`, { status, rejectionReason })
