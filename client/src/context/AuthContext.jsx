import { useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../api/authApi'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ridex_token'))
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('ridex_user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [isLoading, setIsLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return undefined

    getCurrentUser()
      .then(({ data }) => {
        const currentUser = data.data.user
        setUser(currentUser)
        localStorage.setItem('ridex_user', JSON.stringify(currentUser))
      })
      .catch(() => {
        localStorage.removeItem('ridex_token')
        localStorage.removeItem('ridex_user')
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))

    return undefined
  }, [token])

  const saveSession = (responseData) => {
    const nextToken = responseData.data.token
    const nextUser = responseData.data.user
    localStorage.setItem('ridex_token', nextToken)
    localStorage.setItem('ridex_user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  const login = async (credentials) => {
    const { data } = await loginRequest(credentials)
    saveSession(data)
    return data
  }

  const register = async (details) => {
    const { data } = await registerRequest(details)
    return data
  }

  const logout = () => {
    localStorage.removeItem('ridex_token')
    localStorage.removeItem('ridex_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: Boolean(user && token), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

