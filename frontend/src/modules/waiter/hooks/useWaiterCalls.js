// src/modules/waiter/hooks/useWaiterCalls.js
import { useState, useEffect, useCallback } from 'react'
import api           from '@api/axios'
import socketService from '@shared/services/socket.service'

export const useWaiterCalls = () => {
  const [calls,   setCalls]   = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/waiter-call')
      setCalls(data.calls || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const unsub = socketService.on('waiter:call-incoming', refresh)
    return () => unsub()
  }, [refresh])

  const acknowledge = async (callId) => {
    await api.patch(`/waiter-call/${callId}/acknowledge`)
    setCalls((prev) => prev.map((c) => c._id === callId ? { ...c, status: 'acknowledged' } : c))
    socketService.emit('waiter:acknowledge', { callId })
  }

  const onMyWay = async (callId) => {
    await api.patch(`/waiter-call/${callId}/on-the-way`)
    setCalls((prev) => prev.map((c) => c._id === callId ? { ...c, status: 'on_the_way' } : c))
    socketService.emit('waiter:on_the_way', { callId })
  }

  const done = async (callId) => {
    await api.patch(`/waiter-call/${callId}/done`)
    setCalls((prev) => prev.filter((c) => c._id !== callId))
  }

  return { calls, loading, refresh, acknowledge, onMyWay, done }
}