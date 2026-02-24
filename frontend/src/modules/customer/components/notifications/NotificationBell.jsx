// src/modules/customer/components/notifications/NotificationBell.jsx
import { useState }          from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUnreadCount, markAllRead, selectNotifications } from '@store/slices/notificationSlice'
import { COLORS }            from '@colors'
import { Bell, X }           from 'lucide-react'
import NotificationList      from './NotificationList'

const NotificationBell = () => {
  const dispatch    = useDispatch()
  const unread      = useSelector(selectUnreadCount)
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(true)
    if (unread > 0) dispatch(markAllRead())
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={20} color={COLORS.brew.light} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full
                       text-[10px] font-bold text-white flex items-center justify-center px-1"
            style={{ backgroundColor: COLORS.terra.DEFAULT }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed inset-x-0 top-0 z-50 bg-white rounded-b-3xl shadow-xl
                          max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3
                            border-b border-cream-border">
              <h2 className="text-lg font-bold text-brew">Notifications</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center"
              >
                <X size={18} color={COLORS.brew.soft} />
              </button>
            </div>
            <NotificationList />
          </div>
        </>
      )}
    </>
  )
}

export default NotificationBell