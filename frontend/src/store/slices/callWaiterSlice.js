// src/store/slices/callWaiterSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeCall:    null,    // { callId, reasons, note, status, requestedAt }
  isOpen:        false,   // Bottom sheet open
  status:        'idle',  // idle | pending | acknowledged | on_the_way | done
  error:         null,
}

const callWaiterSlice = createSlice({
  name: 'callWaiter',
  initialState,
  reducers: {
    openCallSheet:  (state) => { state.isOpen = true },
    closeCallSheet: (state) => { state.isOpen = false },
    setCallPending: (state, { payload }) => {
      state.activeCall = { ...payload, status: 'pending' }
      state.status     = 'pending'
      state.isOpen     = false
    },
    setCallStatus: (state, { payload: status }) => {
      state.status = status
      if (state.activeCall) state.activeCall.status = status
    },
    clearCall: (state) => {
      state.activeCall = null
      state.status     = 'idle'
    },
    setCallError: (state, { payload }) => { state.error = payload },
  },
})

export const {
  openCallSheet, closeCallSheet, setCallPending, setCallStatus, clearCall, setCallError,
} = callWaiterSlice.actions

export const selectCallSheet    = (s) => s.callWaiter.isOpen
export const selectActiveCall   = (s) => s.callWaiter.activeCall
export const selectCallStatus   = (s) => s.callWaiter.status

export default callWaiterSlice.reducer