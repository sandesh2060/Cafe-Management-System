// src/modules/waiter/hooks/useWaiterOrders.js
import { useState, useEffect, useCallback } from 'react'
import api           from '@api/axios'
import socketService from '@shared/services/socket.service'

export const useWaiterOrders = () => {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/orders/waiter')
      setOrders(data.orders || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    const unsubs = [
      socketService.on('order:new',            refresh),
      socketService.on('order:status-changed', refresh),
      socketService.on('order:ready-pickup',   refresh),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [refresh])

  const markDelivered = async (orderId) => {
    socketService.emit('waiter:delivered', { orderId })
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: 'delivered' } : o))
  }

  return { orders, loading, refresh, markDelivered }
}