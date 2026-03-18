// src/app/App.jsx
//
// ✅ FIX: Lenis and BrowserRouter are now only in providers.jsx — removed
//    duplicate mounts here. App.jsx just composes Provider + AppInner.
// ✅ HMR guard on bootstrapPromise prevents StrictMode double-invoke issues.
// ✅ Bootstrap reads /auth/me once, handles both token shapes safely.
// ✅ Global auth event listeners for session expiry and force-logout.

import { Provider }                    from 'react-redux'
import { Toaster }                     from 'react-hot-toast'
import { useEffect, useState }         from 'react'
import { useDispatch }                 from 'react-redux'
import { useNavigate }                 from 'react-router-dom'
import { ThemeProvider }               from '@shared/context/ThemeContext'
import store                           from '@store'
import Providers                       from './providers'
import AppRoutes                       from './routes/AppRoutes'
import {
  setCredentials,
  clearAuth,
  setBootstrapReady,
}                                      from '@store/slices/authSlice'
import { setSession, clearSession }    from '@store/slices/tableSessionSlice'
import { rehydratePersistedSession }   from '@modules/table/hooks/tableSession.utils'
import { clearCart }                   from '@store/slices/cartSlice'
import api                             from '@api/axios'
import { ENDPOINTS }                   from '@api/endpoints'
import PageTransition                  from '@shared/components/utils/PageTransition'
import useSocket                       from '@shared/hooks/useSocket'
import ToastRenderer                   from '@shared/components/notifications/ToastRenderer'
import { FONTS }                       from '@shared/config/brand'

// ── Bootstrap promise ─────────────────────────────────────────────────────────
// Module-level so StrictMode double-invoke shares the same promise.
// HMR guard resets it on hot-reload so dev never gets a stale bootstrap.
let bootstrapPromise = null

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    bootstrapPromise = null
  })
}

// ── AppInner ──────────────────────────────────────────────────────────────────
// Needs to be inside <Providers> so it can use useDispatch + useNavigate.
const AppInner = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useSocket()

  // Global auth event listeners
  useEffect(() => {
    const handleExpired = () => {
      dispatch(clearAuth())
      dispatch(clearCart())
      dispatch(clearSession())
      navigate('/login', { replace: true })
    }
    const handleLogout = () => {
      navigate('/detect', { replace: true })
    }
    window.addEventListener('auth:session-expired', handleExpired)
    window.addEventListener('auth:logout-redirect', handleLogout)
    return () => {
      window.removeEventListener('auth:session-expired', handleExpired)
      window.removeEventListener('auth:logout-redirect', handleLogout)
    }
  }, [dispatch, navigate])

  // Bootstrap: restore auth session from token
  useEffect(() => {
    const runBootstrap = async () => {
      // StrictMode second invoke — promise already running, just await + mark ready
      if (bootstrapPromise) {
        await bootstrapPromise
        dispatch(setBootstrapReady(true))
        setReady(true)
        return
      }

      bootstrapPromise = (async () => {
        // Rehydrate table session from localStorage (sync)
        dispatch(rehydratePersistedSession())

        const token = localStorage.getItem('kc_token')
        if (!token) return // no token — not logged in

        try {
          const data = await api.get(ENDPOINTS.AUTH.ME)
          // Handle both response shapes for safety
          const user = data?.data ?? data?.user ?? (data?._id ? data : null)
          if (user?._id) {
            dispatch(setCredentials({ user, token }))
          } else {
            localStorage.removeItem('kc_token')
            localStorage.removeItem('kc_user')
            dispatch(clearAuth())
          }
        } catch (err) {
          const status = err?.response?.status
          if (status === 401 || status === 403) {
            console.warn('[App] Token invalid — clearing auth')
          } else {
            console.warn('[App] Bootstrap /auth/me failed:', status ?? 'network error')
          }
          localStorage.removeItem('kc_token')
          localStorage.removeItem('kc_user')
          dispatch(clearAuth())
        }
      })()

      await bootstrapPromise
      dispatch(setBootstrapReady(true))
      setReady(true)
    }

    runBootstrap()
  }, [dispatch])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <>
      <PageTransition>
        <AppRoutes />
      </PageTransition>
      <ToastRenderer />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
// Providers wraps: Redux → BrowserRouter → ThemeProvider → Lenis
// Toaster sits outside AppInner but inside Providers so it can read theme vars.
const App = () => (
  <Providers>
    <AppInner />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          fontFamily: FONTS.body,
          fontSize:   '14px',
          fontWeight: '600',
        },
      }}
    />
  </Providers>
)

export default App