import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

function useRideSocket({ token, rideId, onStatus, onDriverLocation }) {
  const socketRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    if (!token || !rideId) {
      return undefined
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    })
    socketRef.current = socket
    queueMicrotask(() => setConnectionStatus('connecting'))

    socket.on('connect', () => {
      setConnectionStatus('connected')
      socket.emit('ride:subscribe', { rideId })
    })
    socket.on('disconnect', () => setConnectionStatus('disconnected'))
    socket.on('connect_error', () => setConnectionStatus('error'))
    socket.on('ride:status', onStatus)
    socket.on('driver:location', onDriverLocation)

    return () => {
      socket.emit('ride:unsubscribe', { rideId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [onDriverLocation, onStatus, rideId, token])

  const sendDriverLocation = (location) => {
    socketRef.current?.emit('driver:location', { rideId, location })
  }

  const sendDriverStatus = (status) => {
    socketRef.current?.emit('driver:status', { rideId, status })
  }

  return { connectionStatus, sendDriverLocation, sendDriverStatus }
}

export default useRideSocket
