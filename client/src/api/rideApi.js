import api from './axios'

export const createRide = (rideDetails) => api.post('/rides', rideDetails)
export const getMyRides = () => api.get('/rides')
export const getRide = (rideId) => api.get(`/rides/${rideId}`)
export const getRideDriver = (rideId) => api.get(`/rides/${rideId}/driver`)
export const cancelRide = (rideId, reason) => api.patch(`/rides/${rideId}/cancel`, { reason })