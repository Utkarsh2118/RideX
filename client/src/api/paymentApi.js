import api from './axios'

export const createOnlinePayment = (rideId) => api.post(`/payments/${rideId}/create`)
export const confirmCashPayment = (rideId) => api.post(`/payments/${rideId}/confirm-cash`)
export const getPaymentHistory = () => api.get('/payments/history')
