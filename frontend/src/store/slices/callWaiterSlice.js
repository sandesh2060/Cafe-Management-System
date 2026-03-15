// src/store/slices/callWaiterSlice.js
//
// FIXES:
//   • clearCall now also resets isOpen to false — previously the bottom sheet
//     stayed open after a call was cleared (e.g. on resolution)
//   • Valid status values documented in comments for socket handlers

import { createSlice } from '@reduxjs/toolkit'

// Valid status values (set by setCallStatus from socket events):
//   idle | pending | acknowledged | on_the_way | resolved | cancelled
// 'resolved' and 'cancelled' are the terminal states — treated as "done" in UI.
// 'done' is NOT a valid backend status string.

const initialState = {
  activeCall: null,    // { callId, reasons, note, status, requestedAt }
  isOpen:     false,   // bottom sheet open state
  status:     'idle',  // see valid values above
  error:      null,
}

const callWaiterSlice = createSlice({
  name: 'callWaiter',
  initialState,
  reducers: {
    openCallSheet:  (state) => { state.isOpen = true  },
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

    // FIX: also close the sheet when the call is cleared
    // Previously isOpen stayed true after resolution, leaving a stale open sheet
    clearCall: (state) => {
      state.activeCall = null
      state.status     = 'idle'
      state.isOpen     = false
    },

    setCallError: (state, { payload }) => { state.error = payload },
  },
})

export const {
  openCallSheet, closeCallSheet,
  setCallPending, setCallStatus,
  clearCall, setCallError,
} = callWaiterSlice.actions

export const selectCallSheet  = (s) => s.callWaiter.isOpen
export const selectActiveCall = (s) => s.callWaiter.activeCall
export const selectCallStatus = (s) => s.callWaiter.status

export default callWaiterSlice.reducer