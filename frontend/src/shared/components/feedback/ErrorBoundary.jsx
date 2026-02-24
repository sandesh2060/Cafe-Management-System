// src/shared/components/feedback/ErrorBoundary.jsx
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor (props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError (error) {
    return { hasError: true, error }
  }

  componentDidCatch (error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render () {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="text-5xl">😵</div>
          <h2 className="text-xl font-bold text-brew">Something went wrong</h2>
          <p className="text-brew-soft text-sm max-w-xs">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
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