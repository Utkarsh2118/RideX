import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationApi'
import { useAuth } from '../context/useAuth'

function NotificationCenter() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const refresh = () => getNotifications().then(({ data }) => { setNotifications(data.data.notifications); setUnreadCount(data.data.unreadCount) }).catch(() => {})

  useEffect(() => {
    queueMicrotask(refresh)
    const interval = setInterval(refresh, 30000)
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } })
    socket.on('notification:new', (notification) => {
      setNotifications((items) => [notification, ...items])
      setUnreadCount((count) => count + 1)
    })
    return () => { clearInterval(interval); socket.disconnect() }
  }, [token])

  const markRead = (notificationId) => markNotificationRead(notificationId).then(() => refresh())
  const markAllRead = () => markAllNotificationsRead().then(() => refresh())

  return <div className="notification-center"><button type="button" className="icon-button notification-button" aria-label="Notifications" title="Notifications" onClick={() => setIsOpen(!isOpen)}><Bell size={17} />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</button>{isOpen && <div className="notification-panel"><div className="notification-header"><strong>Notifications</strong><button type="button" className="quiet-icon-button" aria-label="Mark all notifications as read" title="Mark all as read" onClick={markAllRead}><CheckCheck size={16} /></button></div>{notifications.length ? notifications.map((notification) => <button type="button" className={`notification-item ${notification.isRead ? '' : 'notification-unread'}`} key={notification.id} onClick={() => !notification.isRead && markRead(notification.id)}><strong>{notification.title}</strong><span>{notification.message}</span></button>) : <p className="empty-state">No notifications yet.</p>}</div>}</div>
}

export default NotificationCenter
