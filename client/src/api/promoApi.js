import api from './axios'

export const validatePromo = (code, fare) => api.post('/promos/validate', { code, fare })
