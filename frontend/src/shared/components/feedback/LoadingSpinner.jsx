// src/shared/components/feedback/LoadingSpinner.jsx
import { COLORS } from '@colors'

const LoadingSpinner = ({ fullScreen = false, size = 40, label = 'Loading...' }) => {
  const spinner = (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <div
        className="rounded-full border-4 border-cream-deep animate-spin"
        style={{
          width:       size,
          height:      size,
          borderTopColor: COLORS.saffron.DEFAULT,
          animationDuration: '0.7s',
        }}
      />
      <span className="text-brew-soft text-sm font-medium">{label}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream z-50">
        {spinner}
      </div>
    )
  }

  return <div className="flex items-center justify-center p-8">{spinner}</div>
}

export default LoadingSpinner