// src/app/App.jsx
import { Provider }             from 'react-redux'
import { BrowserRouter }        from 'react-router-dom'
import { Toaster }              from 'react-hot-toast'
import { useEffect, useState }  from 'react'
import { useDispatch }          from 'react-redux'
import store                    from '@store'
import AppRoutes                from './routes/AppRoutes'
import { ThemeProvider }        from '@shared/context/ThemeContext'
import { setCredentials, clearAuth } from '@store/slices/authSlice'
import '@styles/globals.css'

// ── Synchronous pre-render token cleanup ──────────────────────────────────────
// This runs BEFORE React renders anything — wipes the stale 'token' key
// left by the old authService bug so it can never reach useSocket.
;(() => {
  localStorage.removeItem('token')       // old key — nuke it unconditionally
})()

// ── AppInner ──────────────────────────────────────────────────────────────────
const AppInner = () => {
  const dispatch = useDispatch()
  // Start as false — routes don't render until bootstrap completes
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('kc_token')

      if (!token) {
        setReady(true)
        return
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!res.ok) throw new Error('invalid')

        const data = await res.json()
        dispatch(setCredentials({ user: data.user, token }))
      } catch {
        // Stale/invalid token — clear it before any route or socket mounts
        // The 401 from /auth/me is expected here — browser will log it,
        // that's a browser behaviour and cannot be suppressed from JS
        localStorage.removeItem('kc_token')
        dispatch(clearAuth())
      } finally {
        setReady(true)
      }
    }

    bootstrap()
  }, [dispatch])

  // Render nothing until bootstrap resolves — this prevents ProtectedRoute
  // from mounting and calling useSocket() with a bad token
  if (!ready) return null

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 500,
            border: '1px solid var(--border-color)',
          },
          success: { iconTheme: { primary: '#2D9B5A', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
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
        <AppInner />
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
)

export default App