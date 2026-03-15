import { setSession } from '@store/slices/tableSessionSlice'

const SESSION_KEYS = {
  data:    'kc_session_data',
  id:      'kc_session_id',
  table:   'kc_table_number',
  tableId: 'kc_table_id',
}

export const persistSession = (sessionData) => {
  try {
    localStorage.setItem(SESSION_KEYS.data,    JSON.stringify(sessionData))
    localStorage.setItem(SESSION_KEYS.id,      sessionData.sessionId   ?? '')
    localStorage.setItem(SESSION_KEYS.table,   sessionData.tableNumber ?? '')
    localStorage.setItem(SESSION_KEYS.tableId, sessionData.tableId     ?? '')
  } catch (e) {
    console.warn('[Session] localStorage write failed:', e)
  }
}

export const clearPersistedSession = () => {
  Object.values(SESSION_KEYS).forEach(k => localStorage.removeItem(k))
}

export const rehydratePersistedSession = () => (dispatch) => {
  try {
    const raw = localStorage.getItem(SESSION_KEYS.data)
    if (!raw) return
    const session = JSON.parse(raw)
    if (!session?.sessionId || !session?.tableNumber) {
      clearPersistedSession()
      return
    }
    console.info('[Session] Rehydrating — Table: ' + session.tableNumber)
    dispatch(setSession(session))
  } catch (e) {
    console.warn('[Session] Rehydration failed:', e)
    clearPersistedSession()
  }
}
