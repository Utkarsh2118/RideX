import api from './axios'

export const getWallet = () => api.get('/wallet')
export const topUpWallet = (amount) => api.post('/wallet/topup', { amount })
