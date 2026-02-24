// src/modules/customer/components/notifications/NotificationList.jsx
import { useSelector } from 'react-redux'
import { selectNotifications } from '@store/slices/notificationSlice'
import { formatDistanceToNow } from 'date-fns'
import { COLORS } from '@colors'

const ICONS = {
  order:  '🍽️',
  waiter: '🛎️',
  loyalty:'⭐',
  system: '📢',
}

const NotificationList = () => {
  const notifications = useSelector(selectNotifications)

  if (!notifications.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">🔔</span>
        <p className="text-brew-soft text-sm">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-cream-border">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-5 py-3.5 flex gap-3 ${!n.read ? 'bg-saffron/5' : ''}`}
        >
          <span className="text-2xl flex-shrink-0">{ICONS[n.type] || '📢'}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${!n.read ? 'font-semibold text-brew' : 'text-brew-soft'}`}>
              {n.message}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
            </p>
          </div>
          {!n.read && (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: COLORS.saffron.DEFAULT }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default NotificationList