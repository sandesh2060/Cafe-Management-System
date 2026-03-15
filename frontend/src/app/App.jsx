// src/app/App.jsx
import { Provider }                    from 'react-redux'
import { BrowserRouter, useNavigate }  from 'react-router-dom'
import { Toaster }                     from 'react-hot-toast'
import { useEffect, useState, useRef } from 'react'
import { useDispatch }                 from 'react-redux'
import { ReactLenis }                  from 'lenis/react'
import { ThemeProvider }               from '@shared/context/ThemeContext'
import store                           from '@store'
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

// ── Bootstrap promise — module-level so StrictMode double-invoke shares it ───
// FIX: HMR guard resets the promise when Vite hot-reloads this module,
// preventing the second mount from skipping /auth/me and leaving isLoggedIn=false.
let bootstrapPromise = null

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    bootstrapPromise = null
  })
}

// ── Inner component (needs dispatch + navigate inside Router) ─────────────────
const AppInner = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // FIX: ready starts true if bootstrapPromise already resolved (StrictMode
  // second mount) — avoids double full-screen spinner flash.
  const [ready, setReady] = useState(false)

  useSocket()

  // ── Global auth event listeners ──────────────────────────────────────────
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

  // ── Bootstrap: restore session from localStorage ─────────────────────────
  useEffect(() => {
    const runBootstrap = async () => {
      // StrictMode second invoke: promise already in flight — await it then mark ready
      if (bootstrapPromise) {
        await bootstrapPromise
        dispatch(setBootstrapReady(true))
        setReady(true)
        return
      }

      bootstrapPromise = (async () => {
        // Rehydrate table session from localStorage first (sync)
        dispatch(rehydratePersistedSession())

        const token = localStorage.getItem('kc_token')
        if (!token) return  // no token — not logged in, bootstrap done

        try {
          const data = await api.get(ENDPOINTS.AUTH.ME)
          // FIX: me controller returns { success, data: user } (not sendSuccess wrapper)
          // axios interceptor strips the outer envelope so data = { success, data: user }
          // Handle both shapes for safety.
          const user = data?.data ?? data?.user ?? (data?._id ? data : null)
          if (user?._id) {
            dispatch(setCredentials({ user, token }))
          } else {
            // Token exists but /auth/me returned no valid user — stale token
            localStorage.removeItem('kc_token')
            localStorage.removeItem('kc_user')
            dispatch(clearAuth())
          }
        } catch (err) {
          // 401 = token expired/invalid. Any other error = server down.
          // Either way clear the stale token and start fresh.
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
  }, [dispatch]) // dispatch is stable — correct dep

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-saffron)', borderTopColor: 'transparent' }}
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
const App = () => (
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ReactLenis root options={{ lerp: 0.1, smoothWheel: true, syncTouch: false }}>
          <AppInner />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'Baloo 2, sans-serif',
                fontSize:   '14px',
                fontWeight: '600',
              },
            }}
          />
        </ReactLenis>
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
)

export default App