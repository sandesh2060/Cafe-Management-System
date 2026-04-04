// frontend/src/app/App.jsx
//
// ─── VENUE ENTRY FLOW CHANGES ─────────────────────────────────────────────────
// 1. ADDED: clearVenue dispatch on session expired + logout
// 2. CHANGED: redirect /login → /venue on session expired
// 3. CHANGED: redirect /detect → /venue on logout
// 4. ALL other code — bootstrap, socket, ScrollToTop, etc. — IDENTICAL
// ─────────────────────────────────────────────────────────────────────────────
//
// ★ OWNER BOOTSTRAP FIX ───────────────────────────────────────────────────────
// Bootstrap was calling only /auth/me (customer endpoint).
// If that returns 401, it immediately called clearAuth() — wiping owner Redux
// state set by ownerLogin thunk, and breaking page-reload for owners.
//
// Fix: if /auth/me fails, try GET /owner/me before giving up.
// Only call clearAuth() when BOTH fail.
// ─────────────────────────────────────────────────────────────────────────────

import { Toaster }                   from 'react-hot-toast'
import { useEffect, useState }       from 'react'
import { useDispatch }               from 'react-redux'
import { useNavigate }               from 'react-router-dom'
import store                         from '@store'
import Providers                     from './providers'
import AppRoutes                     from './routes/AppRoutes'
import {
  setCredentials,
  clearAuth,
  setBootstrapReady,
}                                    from '@store/slices/authSlice'
import { clearSession }              from '@store/slices/tableSessionSlice'
import { clearVenue }                from '@store/slices/venueSlice'
import { rehydratePersistedSession } from '@modules/table/hooks/tableSession.utils'
import { clearCart }                 from '@store/slices/cartSlice'
import api                           from '@api/axios'
import { ENDPOINTS }                 from '@api/endpoints'
import PageTransition                from '@shared/components/utils/PageTransition'
import ScrollToTop                   from '@shared/components/utils/ScrollToTop'
import useSocket                     from '@shared/hooks/useSocket'
import ToastRenderer                 from '@shared/components/notifications/ToastRenderer'
import { FONTS }                     from '@shared/config/brand'

// ── Bootstrap promise (module-level singleton) ────────────────────────────────
let bootstrapPromise = null

if (import.meta.hot) {
  import.meta.hot.dispose(() => { bootstrapPromise = null })
}

// ── AppInner ──────────────────────────────────────────────────────────────────
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
      dispatch(clearVenue())
      navigate('/venue', { replace: true })
    }
    const handleLogout = () => {
      navigate('/venue', { replace: true })
    }
    window.addEventListener('auth:session-expired', handleExpired)
    window.addEventListener('auth:logout-redirect', handleLogout)
    return () => {
      window.removeEventListener('auth:session-expired', handleExpired)
      window.removeEventListener('auth:logout-redirect', handleLogout)
    }
  }, [dispatch, navigate])

  // ── Bootstrap: restore auth session from cookie ───────────────────────────
  useEffect(() => {
    const runBootstrap = async () => {
      if (bootstrapPromise) {
        await bootstrapPromise
        dispatch(setBootstrapReady(true))
        setReady(true)
        return
      }

      bootstrapPromise = (async () => {
        dispatch(rehydratePersistedSession())

        // ── Step 1: Try customer session ──────────────────────────────────
        try {
          const data = await api.get(ENDPOINTS.AUTH.ME)
          const user = data?.data ?? data?.user ?? (data?._id ? data : null)
          if (user?._id) {
            dispatch(setCredentials({ user }))
            return   // ✅ customer session restored — done
          }
        } catch (err) {
          const status = err?.response?.status
          if (status !== 401 && status !== 403) {
            console.warn('[App] Bootstrap /auth/me failed:', status ?? 'network error')
          }
          // fall through to owner check
        }

        // ★ Step 2: Try owner session ──────────────────────────────────────
        // Runs when customer /auth/me returns 401/403 (no customer cookie).
        // Owner sets kc_owner_token (separate httpOnly cookie).
        // Without this, every page reload logs the owner out.
        try {
          const data = await api.get('/owner/me')
          const owner = data?.data?.owner
            ?? data?.data
            ?? data?.owner
            ?? (data?._id ? data : null)
          if (owner?._id) {
            // Inject role:'owner' — owner.model has no role field
            dispatch(setCredentials({ user: { ...owner, role: 'owner' } }))
            return   // ✅ owner session restored — done
          }
        } catch (err) {
          // 401/403 = no owner cookie either — totally fine, just not logged in
          const status = err?.response?.status
          if (status !== 401 && status !== 403) {
            console.warn('[App] Bootstrap /owner/me failed:', status ?? 'network error')
          }
        }

        // Both failed → clear any stale state
        dispatch(clearAuth())
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
      <ScrollToTop />
      <PageTransition>
        <AppRoutes />
      </PageTransition>
      <ToastRenderer />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
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