import api from './axios'

export const getDriverProfile = () => api.get('/drivers/me')
export const setDriverOnline = (isOnline) => api.patch('/drivers/me/online', { isOnline })
export const getRideRequests = () => api.get('/driver-rides/requests')
export const getActiveDriverRide = () => api.get('/driver-rides/active')
export const acceptDriverRide = (rideId) => api.post(`/driver-rides/${rideId}/accept`)
export const rejectDriverRide = (rideId) => api.post(`/driver-rides/${rideId}/reject`)
export const updateDriverRideStatus = (rideId, status) => api.patch(`/driver-rides/${rideId}/status`, { status })
