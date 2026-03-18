// src/shared/context/ThemeContext.jsx
//
// ✅ DEFINITIVE WHITE GAP FIX:
//    Added direct background injection on <body> and #root on every theme change.
//    This ensures the browser's default white background is never visible
//    regardless of layout/overflow/flex behaviour in child components.
//    var(--bg) is set on :root AND directly on body/root element.
//
// ✅ Injects ALL brand CSS vars onto :root on every theme change
// ✅ Injects font-family on :root from FONTS.body
// ✅ Loads Google Fonts from FONTS.googleUrl
// ✅ useTheme() hook exported for convenience
// ✅ Theme persisted in localStorage under 'theme' key

import { createContext, useContext, useEffect, useState } from 'react'
import { getCssVars, FONTS, PALETTE } from '@shared/config/brand'

export const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // ── Inject Google Fonts once on mount ─────────────────────────────────────
  useEffect(() => {
    if (!FONTS.googleUrl) return
    const id = 'brand-google-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id   = id
    link.rel  = 'stylesheet'
    link.href = FONTS.googleUrl
    document.head.appendChild(link)
  }, [])

  // ── Apply theme on every change ───────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const rootEl = document.getElementById('root')

    // 1. Dark/light class
    if (isDark) root.classList.add('dark')
    else        root.classList.remove('dark')

    // 2. All palette tokens as CSS vars on :root
    const vars = getCssVars(isDark)
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val))

    // 3. Font family tokens
    root.style.setProperty('--font-heading',      FONTS.heading)
    root.style.setProperty('--font-body',         FONTS.body)
    root.style.setProperty('--font-serif',        FONTS.serif)
    root.style.setProperty('--font-display',      FONTS.display)
    root.style.setProperty('--font-mono',         FONTS.mono)
    root.style.setProperty('--font-brand',        FONTS.brand)
    root.style.setProperty('--font-cafe-name',    FONTS.cafeName)
    root.style.setProperty('--font-welcome-name', FONTS.welcomeName)
    root.style.setProperty('--font-welcome-body', FONTS.welcomeBody)

    // 4. Body font
    root.style.setProperty('font-family', FONTS.body)

    // 5. ── DEFINITIVE FIX ──────────────────────────────────────────────────
    //    Directly set background on <body> and #root so the browser's default
    //    white is never visible anywhere — regardless of child layout behaviour.
    //    This is the only reliable way to guarantee no white gap in dark mode.
    const bgColor = isDark ? PALETTE.dark.bg : PALETTE.light.bg
    body.style.background = bgColor
    body.style.backgroundColor = bgColor
    if (rootEl) {
      rootEl.style.background = bgColor
      rootEl.style.backgroundColor = bgColor
    }
    // ──────────────────────────────────────────────────────────────────────

    // 6. Persist
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

export default ThemeProvider