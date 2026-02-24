// src/shared/hooks/useTheme.js
import { useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}