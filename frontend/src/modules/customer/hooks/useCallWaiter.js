// src/modules/customer/hooks/useCallWaiter.js
//
// FIXES (this pass):
//  1. data.call access guarded — handles both flat { call: {...} } and nested
//     { data: { call: {...} } } backend shapes (axios interceptor unwraps one
//     level, but some endpoints wrap in a second 'data' key).
//  2. Socket emit gated on callId existence — never emits callId: undefined.
//  3. buildCallReasons wrapped in useMemo — only recomputes when items change.
//  4. toggleReason and setNote now clear stale errors on change.
//  5. setNote enforces NOTE_MAX (100) at input time so the UI can show a counter
//     and the API payload always matches what the user sees.

import { useState, useCallback, useMemo } from 'react'
import { useDispatch, useSelector }        from 'react-redux'
import {
  openCallSheet,
  closeCallSheet,
  setCallPending,
}                                          from '@store/slices/callWaiterSlice'
import { selectActiveOrder }               from '@store/slices/orderSlice'
import { selectSessionId }                 from '@store/slices/tableSessionSlice'
import socketService                       from '@shared/services/socket.service'
import api                                 from '@api/axios'
import { ENDPOINTS }                       from '@api/endpoints'
import { buildCallReasons }                from '../utils/buildCallReasons'

export const NOTE_MAX = 100   // exported so the UI can show a character counter

export const useCallWaiter = () => {
  const dispatch    = useDispatch()
  const activeOrder = useSelector(selectActiveOrder)
  const sessionId   = useSelector(selectSessionId)

  const [selectedReasons, setSelectedReasons] = useState([])
  const [note,            setNoteRaw]         = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)

  // FIX: memoize — only recomputes when order items change
  const reasons = useMemo(
    () => buildCallReasons(activeOrder?.items ?? []),
    [activeOrder?.items]
  )

  // FIX: setNote enforces NOTE_MAX at input time
  const setNote = useCallback((val) => {
    setNoteRaw(val.slice(0, NOTE_MAX))
    setError(null)   // FIX: clear stale error when user edits note
  }, [])

  const toggleReason = useCallback((id) => {
    setSelectedReasons((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
      return next
    })
    setError(null)   // FIX: clear stale error when user changes selection
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
        note:      note.trim(),
        orderId:   activeOrder?._id,
        sessionId,
      })

      // FIX: handle both { call: {...} } and { data: { call: {...} } } shapes
      const callPayload = data?.call ?? data?.data?.call ?? data ?? {}
      const callId      = callPayload._id

      // FIX: only emit socket if we have a valid callId
      if (callId) {
        socketService.emit('waiter:call-request', {
          callId,
          reasons:   selectedReasons,
          note:      note.trim(),
          orderId:   activeOrder?._id,
          sessionId,
          tableId:   activeOrder?.tableId,
        })

        dispatch(setCallPending({
          callId,
          reasons:   selectedReasons,
          note:      note.trim(),
        }))
      } else {
        // API succeeded but returned no call ID — treat as partial failure
        console.error('[useCallWaiter] API response missing call._id:', data)
        setError('Waiter was called, but confirmation failed. Please try again if no one arrives.')
      }

      // Reset form regardless — the call was created server-side
      setSelectedReasons([])
      setNoteRaw('')
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
    // Alias for CallWaiterPage (which calls onSelectReason / onNoteChange / onSubmit)
    onSelectReason: toggleReason,
    onNoteChange:   setNote,
    onSubmit:       submitCall,
    openSheet:      () => dispatch(openCallSheet()),
    closeSheet:     () => dispatch(closeCallSheet()),
  }
}