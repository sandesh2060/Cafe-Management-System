// src/modules/customer/hooks/useOrderHistory.js
import { useState, useEffect } from 'react'
import api from '@api/axios'

export const useOrderHistory = () => {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/orders/history')
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { orders, loading, error }
}