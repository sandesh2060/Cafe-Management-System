// src/app/App.jsx
import { Provider }            from 'react-redux'
import { BrowserRouter }       from 'react-router-dom'
import { Toaster }             from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useDispatch }         from 'react-redux'
import { ReactLenis }          from 'lenis/react'
import store                   from '@store'
import AppRoutes               from './routes/AppRoutes'
import { ThemeProvider }       from '@shared/context/ThemeContext'
import { setCredentials, clearAuth } from '@store/slices/authSlice'
import '@styles/globals.css'

// Wipe old token key from any previous version
;(() => { localStorage.removeItem('token') })()

/* ── Lenis options — buttery 60fps smooth scroll ────────────────────────── */
const LENIS_OPTIONS = {
  lerp:            0.1,
  duration:        1.2,
  smoothWheel:     true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.8,
  infinite:        false,
  easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
}

/* ── Toast style tokens ─────────────────────────────────────────────────── */
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

const AppInner = () => {
  const dispatch = useDispatch()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('kc_token')
      if (!token) { setReady(true); return }

      try {
        // Build headers — include ngrok bypass in dev so the bootstrap
        // fetch isn't blocked by ngrok's HTML interstitial page.
        const headers = {
          Authorization: `Bearer ${token}`,
          ...(import.meta.env.DEV && { 'ngrok-skip-browser-warning': 'true' }),
        }

        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`,
          { headers }
        )
        if (!res.ok) throw new Error('invalid')
        const json = await res.json()
        const user = json.data?.user ?? json.data ?? json.user
        if (!user) throw new Error('no user in response')
        dispatch(setCredentials({ user, token }))
      } catch {
        localStorage.removeItem('kc_token')
        dispatch(clearAuth())
      } finally {
        setReady(true)
      }
    }
    bootstrap()
  }, [dispatch])

  if (!ready) return null

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(16px, env(safe-area-inset-top))' }}
        toastOptions={{
          duration: 2800,
          style: toastStyle,
          success: {
            iconTheme: { primary: '#2D9B5A', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#fff' },
          },
        }}
      />
    </>
  )
}

const App = () => (
  <Provider store={store}>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ThemeProvider>
        {/* ReactLenis wraps the whole app — site-wide smooth scroll */}
        <ReactLenis root options={LENIS_OPTIONS}>
          <AppInner />
        </ReactLenis>
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
)

export default App