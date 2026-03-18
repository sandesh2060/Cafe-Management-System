 
// ─────────────────────────────────────────────────────────────────────────────
 
 
// src/shared/components/feedback/ErrorBoundary.jsx
//
// ✅ bg-cream, text-brew, text-brew-soft Tailwind aliases replaced with inline CSS vars
// ✅ ErrorBoundary is a class component — can't use useContext/hooks
//    CSS vars on :root are always available (set by ThemeContext) so inline
//    style={{ color: 'var(--text-primary)' }} always works correctly
 
import { Component } from 'react'
 
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
 
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
 
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
 
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4"
          // ✅ var(--bg) — was bg-cream hardcoded Tailwind class
          style={{ background: 'var(--bg)' }}
        >
          <div className="text-5xl">😵</div>
 
          <h2
            style={{
              // ✅ var(--text-primary) — was text-brew
              color:      'var(--text-primary)',
              fontFamily: 'var(--font-heading, system-ui)',
              fontSize:   20,
              fontWeight: 700,
              margin:     0,
            }}
          >
            Something went wrong
          </h2>
 
          <p
            style={{
              // ✅ var(--text-muted) — was text-brew-soft
              color:      'var(--text-muted)',
              fontFamily: 'var(--font-body, system-ui)',
              fontSize:   14,
              maxWidth:   280,
              margin:     0,
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
 
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="btn-brand px-8 mt-2"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
 
export default ErrorBoundary