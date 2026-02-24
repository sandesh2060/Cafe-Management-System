// src/modules/customer/hooks/useCallWaiter.js
import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { openCallSheet, closeCallSheet, setCallPending, setCallStatus } from '@store/slices/callWaiterSlice'
import { selectActiveOrder } from '@store/slices/orderSlice'
import { selectSessionId }   from '@store/slices/tableSessionSlice'
import socketService          from '@shared/services/socket.service'
import api                    from '@api/axios'
import { ENDPOINTS }          from '@api/endpoints'
import { buildCallReasons }   from '../utils/buildCallReasons'

export const useCallWaiter = () => {
  const dispatch      = useDispatch()
  const activeOrder   = useSelector(selectActiveOrder)
  const sessionId     = useSelector(selectSessionId)

  const [selectedReasons, setSelectedReasons] = useState([])
  const [note, setNote]                       = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState(null)

  // Build reasons from current order items
  const reasons = buildCallReasons(activeOrder?.items || [])

  const toggleReason = useCallback((id) => {
    setSelectedReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }, [])

  const submitCall = useCallback(async () => {
    if (selectedReasons.length === 0 && !note.trim()) {
      setError('Please select at least one reason.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await api.post(ENDPOINTS.WAITER_CALL.CREATE, {
        reasons:   selectedReasons,
        note:      note.trim().slice(0, 100),
        orderId:   activeOrder?._id,
        sessionId,
      })

      // Also emit via socket for instant waiter notification
      socketService.emit('waiter:call-request', {
        callId:    data.call._id,
        reasons:   selectedReasons,
        note:      note.trim(),
        orderId:   activeOrder?._id,
        sessionId,
        tableId:   activeOrder?.tableId,
      })

      dispatch(setCallPending({ callId: data.call._id, reasons: selectedReasons, note: note.trim() }))

      // Reset form
      setSelectedReasons([])
      setNote('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to call waiter. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedReasons, note, activeOrder, sessionId, dispatch])

  return {
    reasons,
    selectedReasons,
    note,
    setNote,
    loading,
    error,
    toggleReason,
    submitCall,
    openSheet:  () => dispatch(openCallSheet()),
    closeSheet: () => dispatch(closeCallSheet()),
  }
}