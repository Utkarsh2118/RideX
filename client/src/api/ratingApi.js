import api from './axios'

export const submitRating = (rideId, rating, comment) => api.post(`/ratings/${rideId}`, { rating, comment })
export const getRideRatings = (rideId) => api.get(`/ratings/ride/${rideId}`)
