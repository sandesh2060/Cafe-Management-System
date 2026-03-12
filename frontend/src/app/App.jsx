// src/app/App.jsx
import { Provider }            from 'react-redux'
import { BrowserRouter }       from 'react-router-dom'
import { Toaster }             from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useDispatch }         from 'react-redux'
import { ReactLenis, useLenis } from 'lenis/react'
import store                   from '@store'
import AppRoutes               from './routes/AppRoutes'
import { ThemeProvider }       from '@shared/context/ThemeContext'
import { setCredentials, clearAuth } from '@store/slices/authSlice'
import { setSession, clearSession }  from '@store/slices/tableSessionSlice'
import { setTableInfo }              from '@store/slices/cartSlice'
import ScrollToTop             from '@shared/components/utils/ScrollToTop'
import PageTransition          from '@shared/components/utils/PageTransition'
import { setLenisInstance }    from '@shared/utils/lenisLock'
import '@styles/globals.css'

;(() => { localStorage.removeItem('token') })()

const LENIS_OPTIONS = {
  lerp:            0.1,
  duration:        1.2,
  smoothWheel:     true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.8,
  infinite:        false,
  easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
}

const toastStyle = {
  background:   'var(--bg-surface)',
  color:        'var(--text-primary)',
  borderRadius: '14px',
  boxShadow:    'var(--shadow-lg)',
  fontFamily:   '"DM Sans", sans-serif',
  fontWeight:   600,
  fontSize:     '13px',
  border:       '1px solid var(--border-color)',
  padding:      '10px 14px',
}

const rehydrateSessionFromStorage = (dispatch) => {
  try {
    const raw = localStorage.getItem('kc_session_data')
    if (!raw) return false
    const session = JSON.parse(raw)
    if (!session?.sessionId || !session?.tableNumber) {
      localStorage.removeItem('kc_session_data')
      return false
    }
    dispatch(setSession(session))
    dispatch(setTableInfo({ tableId: session.tableId, sessionId: session.sessionId }))
    return true
  } catch (e) {
    localStorage.removeItem('kc_session_data')
    return false
  }
}

// ── LenisRegistrar ────────────────────────────────────────────────────────────
// Dual-path registration: callback form (lenis/react v1.1+) + plain hook (all versions).
// Both set the same module-level singleton. Whichever fires first wins.
// ─────────────────────────────────────────────────────────────────────────────
function LenisRegistrar() {
  // Path 1: callback form fires synchronously when Lenis is ready
  useLenis((lenis) => { if (lenis) setLenisInstance(lenis) })

  // Path 2: plain hook — works in ALL lenis/react versions
  const lenis = useLenis()
  useEffect(() => { if (lenis) setLenisInstance(lenis) }, [lenis])

  return null
}

/* ── AppInner ────────────────────────────────────────────────────────────── */
const AppInner = () => {
  const dispatch = useDispatch()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const token     = localStorage.getItem('kc_token')
      const sessionId = localStorage.getItem('kc_session_id')
      const baseUrl   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const devHeaders = import.meta.env.DEV ? { 'ngrok-skip-browser-warning': 'true' } : {}

      const hadCachedSession = rehydrateSessionFromStorage(dispatch)

      if (token) {
        try {
          const res  = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}`, ...devHeaders } })
          if (!res.ok) throw new Error('invalid')
          const json = await res.json()
          const user = json.data?.user ?? json.data ?? json.user
          if (!user) throw new Error('no user')
          dispatch(setCredentials({ user, token }))
        } catch {
          localStorage.removeItem('kc_token')
          dispatch(clearAuth())
        }
      }

      if (sessionId) {
        try {
          const res = await fetch(`${baseUrl}/table-session/active?sessionId=${sessionId}`, {
            headers: { 'x-session-id': sessionId, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...devHeaders },
          })
          if (res.ok) {
            const json    = await res.json()
            const session = json.session ?? json.data?.session ?? null
            if (session) {
              const cachedRaw = localStorage.getItem('kc_session_data')
              const cached    = cachedRaw ? JSON.parse(cachedRaw) : {}
              const freshSession = {
                ...cached, ...session,
                tableNumber: session.tableNumber ?? json.table?.tableNumber ?? cached.tableNumber ?? null,
                status:    session.status    ?? cached.status    ?? 'active',
                createdAt: session.createdAt ?? cached.createdAt ?? new Date().toISOString(),
                openedAt:  session.openedAt  ?? cached.openedAt  ?? new Date().toISOString(),
              }
              localStorage.setItem('kc_session_data', JSON.stringify(freshSession))
              localStorage.setItem('kc_table_number', freshSession.tableNumber ?? '')
              dispatch(setSession(freshSession))
              dispatch(setTableInfo({ tableId: freshSession.tableId, sessionId: freshSession.sessionId }))
            } else {
              _clearAllSessionStorage(); dispatch(clearSession())
            }
          } else if (res.status === 404) {
            _clearAllSessionStorage(); dispatch(clearSession())
          }
        } catch (err) {
          console.warn('[App] Session verify network error — keeping cached session:', err.message)
        }
      } else if (!hadCachedSession) {
        dispatch(clearSession())
      }

      setReady(true)
    }
    bootstrap()
  }, [dispatch])

  if (!ready) return null

  return (
    <>
      <ScrollToTop />
      <PageTransition><AppRoutes /></PageTransition>
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(16px, env(safe-area-inset-top))' }}
        toastOptions={{
          duration: 2800, style: toastStyle,
          success: { iconTheme: { primary: '#2D9B5A', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />
    </>
  )
}

const _clearAllSessionStorage = () =>
  ['kc_session_data', 'kc_session_id', 'kc_table_number', 'kc_table_id'].forEach(k => localStorage.removeItem(k))

/* ── App root ────────────────────────────────────────────────────────────── */
const App = () => (
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ReactLenis root options={LENIS_OPTIONS}>
          <LenisRegistrar />
          <AppInner />
        </ReactLenis>
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
)

export default App