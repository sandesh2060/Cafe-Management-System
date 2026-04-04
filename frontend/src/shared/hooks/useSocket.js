// frontend/src/shared/hooks/useSocket.js
//
// ─── CHANGES (Week 2) ─────────────────────────────────────────────────────────
// Added Socket → RTK Query bridge at the bottom of the useEffect.
// Socket events now call dispatch(api.util.invalidateTags([...]))
// so RTK Query refetches stale data instantly — zero polling needed.
//
// Bridge mappings (per master plan §8.1):
//   menu:updated          → invalidate Menu LIST
//   order:status_update   → invalidate Order by id
//   order:updated         → invalidate Order by id
//   order:cancelled       → invalidate Order by id + ACTIVE
//   order:placed          → invalidate Order ACTIVE
//   session:updated       → invalidate Session LIST
//   theme:updated         → invalidate Tenant THEME
//   subscription:*        → invalidate Subscription ME + Tenant ME
//   notification:new      → invalidate Notification LIST
//   inventory:alert       → invalidate Inventory LIST
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef }        from 'react'
import { useSelector, useDispatch } from 'react-redux'
import socketService                from '@shared/services/socket.service'
import { api }                      from '@api/apiSlice'
import {
  selectToken,
  selectRole,
  selectIsLoggedIn,
}                                   from '@store/slices/authSlice'
import { ROLE_SOUND_MAP }           from '@sounds'
import { playSound }                from '@shared/utils/soundPlayer'
import {
  receiveMessage,
  messageSent,
  setReadReceipt,
}                                   from '@store/slices/messagingSlice'
import { playNotificationSound }    from '@shared/hooks/useNotificationSound'
import {
  socketStatusUpdate,
  socketOrderCancelled,
  socketOrderUpdated,
}                                   from '@store/slices/orderSlice'
import {
  receiveMessage  as receiveSocialMsg,
  markThreadSeen,
  updateReaction,
  setTyping,
  vanishMessages,
  messageDeleted,
  chatDeleted,
}                                   from '@store/slices/socialChatSlice'
import {
  setUserOnline,
  setUserOffline,
  updateStatus,
  addPendingRequest,
}                                   from '@store/slices/followSlice'
import { addNotification }          from '@store/slices/notificationSlice'
import { showToast }                from '@store/slices/toastSlice'

export const useSocket = () => {
  const token      = useSelector(selectToken)
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)
  const dispatch   = useDispatch()
  const connected  = useRef(false)

  useEffect(() => {
    // With cookie auth, token is always null — use isLoggedIn as the trigger
    const shouldConnect = token || isLoggedIn
    if (!shouldConnect) {
      if (socketService.isConnected) socketService.disconnect()
      connected.current = false
      return
    }

    // Pass token if present (legacy), otherwise pass empty string.
    // Backend will fall back to reading kc_token from the cookie header.
    const socket = socketService.connect(token || '')
    if (!socket) return
    connected.current = true

    // ── notification:new ──────────────────────────────────────────────────
    const unsubNotif = socketService.on('notification:new', (data) => {
      const type = data?.notification?.type ?? data?.type ?? 'system'
      playNotificationSound(type)
    })

    // ── Role sounds ───────────────────────────────────────────────────────
    const soundEvents = Object.keys(ROLE_SOUND_MAP[role] || {})
    const unsubSounds = soundEvents.map((event) =>
      socketService.on(event, () => {
        const soundKey = ROLE_SOUND_MAP[role]?.[event]
        if (soundKey) playSound(soundKey, role)
      })
    )

    // ── Staff messaging ───────────────────────────────────────────────────
    const unsubMsg         = socketService.on('message:received',     (msg)  => { dispatch(receiveMessage(msg)); playSound('newMessage', role); playNotificationSound('message') })
    const unsubMsgSent     = socketService.on('message:sent',         (msg)  => dispatch(messageSent(msg)))
    const unsubReadReceipt = socketService.on('message:read-receipt', (data) => dispatch(setReadReceipt(data)))

    // ── Orders ────────────────────────────────────────────────────────────
    const unsubOrderStatus    = socketService.on('order:status_update', (data) => {
      dispatch(socketStatusUpdate({ orderId: data.orderId ?? data.order?._id, status: data.status ?? data.order?.status, order: data.order ?? null }))
      // ★ RTK Query bridge
      const id = data.orderId ?? data.order?._id
      if (id) dispatch(api.util.invalidateTags([{ type: 'Order', id }]))
    })
    const unsubOrderCancelled = socketService.on('order:cancelled', (data) => {
      dispatch(socketOrderCancelled({ order: data.order }))
      // ★ RTK Query bridge
      const id = data.order?._id
      if (id) dispatch(api.util.invalidateTags([{ type: 'Order', id }, { type: 'Order', id: 'ACTIVE' }]))
    })
    const unsubOrderUpdated = socketService.on('order:updated', (data) => {
      if (data?.order) dispatch(socketOrderUpdated({ order: data.order }))
      // ★ RTK Query bridge
      const id = data?.order?._id
      if (id) dispatch(api.util.invalidateTags([{ type: 'Order', id }]))
    })
    const unsubOrderPlaced = socketService.on('order:placed', () => {
      playNotificationSound('order')
      // ★ RTK Query bridge
      dispatch(api.util.invalidateTags([{ type: 'Order', id: 'ACTIVE' }]))
    })

    // ── Menu ──────────────────────────────────────────────────────────────
    // ★ RTK Query bridge — menu changes bust the full list cache
    const unsubMenuUpdated = socketService.on('menu:updated', () => {
      dispatch(api.util.invalidateTags([{ type: 'Menu', id: 'LIST' }]))
    })

    // ── Table sessions ────────────────────────────────────────────────────
    // ★ RTK Query bridge
    const unsubSessionUpdated = socketService.on('session:updated', () => {
      dispatch(api.util.invalidateTags([{ type: 'Session', id: 'LIST' }]))
    })

    // ── Theme ─────────────────────────────────────────────────────────────
    // ★ RTK Query bridge — manager saved a new theme preset
    const unsubThemeUpdated = socketService.on('theme:updated', () => {
      dispatch(api.util.invalidateTags([{ type: 'Tenant', id: 'THEME' }]))
    })

    // ── Subscription ──────────────────────────────────────────────────────
    // ★ RTK Query bridge — plan activated / expiring / grace / readonly
    const invalidateSub = () => {
      dispatch(api.util.invalidateTags([
        { type: 'Subscription', id: 'ME' },
        { type: 'Tenant',       id: 'ME' },
      ]))
    }
    const unsubSubActivated   = socketService.on('subscription:activated',    invalidateSub)
    const unsubSubExpiring    = socketService.on('subscription:expiring',      invalidateSub)
    const unsubSubGrace       = socketService.on('subscription:grace_started', invalidateSub)
    const unsubSubReadonly    = socketService.on('subscription:readonly',      invalidateSub)

    // ── Inventory ─────────────────────────────────────────────────────────
    // ★ RTK Query bridge — low stock alert
    const unsubInventoryAlert = socketService.on('inventory:alert', () => {
      dispatch(api.util.invalidateTags([{ type: 'Inventory', id: 'LIST' }]))
    })

    // ── Notifications ─────────────────────────────────────────────────────
    // ★ RTK Query bridge — new notification busts notification list cache
    const unsubNotifNew = socketService.on('notification:new', (data) => {
      dispatch(api.util.invalidateTags([{ type: 'Notification', id: 'LIST' }]))
      dispatch(addNotification(data?.notification ?? data))
    })

    // ── Social chat ───────────────────────────────────────────────────────
    const unsubSocialMsg = socketService.on('social:message', ({ message }) => {
      if (!message) return
      dispatch(receiveSocialMsg(message))
      playNotificationSound('message')
      dispatch(showToast({ type: 'message', title: message.fromUserId?.name ?? 'Someone', message: message.content?.slice(0, 60) ?? '' }))
    })
    const unsubSocialSeen  = socketService.on('social:seen',        ({ threadId, seenAt }) => dispatch(markThreadSeen({ threadId, seenAt })))
    const unsubSocialReact = socketService.on('social:reaction',    (payload)              => dispatch(updateReaction(payload)))

    const unsubVanish = socketService.on('social:vanish', ({ threadId, messageIds }) => {
      if (threadId && messageIds?.length) dispatch(vanishMessages({ threadId, messageIds }))
    })
    const unsubMsgDeleted  = socketService.on('social:message_deleted', ({ messageId, threadId }) => {
      if (messageId && threadId) dispatch(messageDeleted({ messageId, threadId }))
    })
    const unsubChatDeleted = socketService.on('social:chat_deleted', ({ threadId }) => {
      if (threadId) dispatch(chatDeleted({ threadId }))
    })
    const unsubTyping     = socketService.on('social:typing',      ({ fromUserId }) => dispatch(setTyping({ userId: fromUserId, isTyping: true })))
    const unsubStopTyping = socketService.on('social:stop_typing', ({ fromUserId }) => dispatch(setTyping({ userId: fromUserId, isTyping: false })))
    const unsubOnline     = socketService.on('social:online',  ({ userId }) => dispatch(setUserOnline(userId)))
    const unsubOffline    = socketService.on('social:offline', ({ userId }) => dispatch(setUserOffline(userId)))

    // ── Follow ────────────────────────────────────────────────────────────
    const unsubFollowReq = socketService.on('follow:request', ({ from }) => {
      if (!from) return
      dispatch(addPendingRequest(from))
      dispatch(addNotification({ title: 'New Follow Request', message: `${from.name} wants to follow you`, type: 'system', read: false, data: { action: 'follow_request', senderId: from._id, senderAvatar: from.avatarUrl } }))
      dispatch(showToast({ type: 'system', title: '👤 Follow Request', message: `${from.name} wants to follow you` }))
      playNotificationSound('system')
    })
    const unsubFollowAcc = socketService.on('follow:accepted', ({ by }) => {
      if (!by) return
      dispatch(updateStatus({ userId: by._id, status: 'mutual' }))
      dispatch(addNotification({ title: 'Follow Accepted 🎉', message: `${by.name} accepted your follow request. You can now chat!`, type: 'system', read: false, data: { action: 'follow_accepted', userId: by._id, userAvatar: by.avatarUrl } }))
      dispatch(showToast({ type: 'system', title: 'Follow Accepted 🎉', message: `${by.name} accepted! You can now chat.` }))
    })
    const unsubFollowDec    = socketService.on('follow:declined',      ({ by })             => { if (by) dispatch(updateStatus({ userId: by, status: 'none' })) })
    const unsubFollowStatus = socketService.on('follow:status_update', ({ userId, status }) => { if (userId) dispatch(updateStatus({ userId, status })) })

    const onAuthError = () => console.warn('[useSocket] auth error')
    window.addEventListener('socket:auth-error', onAuthError)

    return () => {
      unsubNotif()
      unsubSounds.forEach(fn => fn())
      unsubMsg(); unsubMsgSent(); unsubReadReceipt()
      unsubOrderStatus(); unsubOrderCancelled(); unsubOrderUpdated(); unsubOrderPlaced()
      // ★ New unsubs
      unsubMenuUpdated()
      unsubSessionUpdated()
      unsubThemeUpdated()
      unsubSubActivated(); unsubSubExpiring(); unsubSubGrace(); unsubSubReadonly()
      unsubInventoryAlert()
      unsubNotifNew()
      unsubSocialMsg(); unsubSocialSeen(); unsubSocialReact(); unsubVanish(); unsubMsgDeleted(); unsubChatDeleted()
      unsubTyping(); unsubStopTyping(); unsubOnline(); unsubOffline()
      unsubFollowReq(); unsubFollowAcc(); unsubFollowDec(); unsubFollowStatus()
      window.removeEventListener('socket:auth-error', onAuthError)
    }
  }, [token, isLoggedIn, role, dispatch])

  return socketService
}

export default useSocket