// src/modules/customer/pages/TableDetectionPage.jsx
import { useEffect, useRef } from 'react'
import { useTableDetection } from '@modules/table/hooks/useTableDetection'
import { useNavigate }       from 'react-router-dom'
import { useSelector }       from 'react-redux'
import { selectIsLoggedIn }  from '@store/slices/authSlice'
import GpsStatusIndicator    from '@modules/table/components/GpsStatusIndicator'
import QrScannerOverlay      from '@modules/table/components/QrScannerOverlay'
import { COLORS }            from '@colors'
import { Wifi, QrCode, Hash } from 'lucide-react'
import gsap from 'gsap'

const TableDetectionPage = () => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const navigate   = useNavigate()
  const logoRef    = useRef(null)
  const cardRef    = useRef(null)

  const {
    state, context, startGPS, onQrScanned, onManualEntry,
    retry, isDetecting, isQR, isDone, isError,
  } = useTableDetection()

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) navigate('/menu', { replace: true })
  }, [isLoggedIn, navigate])

  // Entrance animation
  useEffect(() => {
    gsap.fromTo(logoRef.current,
      { y: -30, opacity: 0 },
      { y: 0,   opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
    )
    gsap.fromTo(cardRef.current,
      { y: 40, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.6, delay: 0.3, ease: 'power3.out' }
    )
  }, [])

  // Auto-start GPS on mount
  useEffect(() => {
    startGPS()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-brew to-brew-light
                    flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <div ref={logoRef} className="text-center mb-10">
        <div className="w-20 h-20 rounded-3xl bg-brand-gradient shadow-brand
                        flex items-center justify-center mx-auto mb-4 text-4xl">
          ☕
        </div>
        <h1 className="text-3xl font-bold text-white font-display">कौसी चिया</h1>
        <p className="text-brew-cream text-sm mt-1">Smart Cafe · Kathmandu</p>
      </div>

      {/* Detection card */}
      <div ref={cardRef} className="w-full max-w-sm">
        {/* GPS detecting */}
        {(state === 'idle' || state === 'requestingGPS' || state === 'collectingReadings') && (
          <div className="card text-center space-y-6 py-8">
            <GpsStatusIndicator state={state} />
            <div>
              <h2 className="text-xl font-bold text-brew">Finding Your Table</h2>
              <p className="text-gray-500 text-sm mt-1">
                {state === 'collectingReadings'
                  ? 'Getting accurate GPS readings…'
                  : 'Allow location to detect your table automatically'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
              <Wifi size={14} />
              <span>GPS · No QR needed</span>
            </div>
          </div>
        )}

        {/* QR fallback */}
        {isQR && (
          <div className="card space-y-5 py-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-saffron-soft flex items-center
                              justify-center mx-auto mb-3">
                <QrCode size={28} color={COLORS.saffron.DEFAULT} />
              </div>
              <h2 className="text-xl font-bold text-brew">Scan Table QR</h2>
              <p className="text-gray-500 text-sm mt-1">
                GPS unavailable. Scan the QR code on your table.
              </p>
            </div>

            <QrScannerOverlay onScan={onQrScanned} />

            {/* Manual fallback */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-center text-xs text-gray-400 mb-3">No QR code?</p>
              <ManualTableEntry onSubmit={onManualEntry} />
            </div>
          </div>
        )}

        {/* Creating session */}
        {state === 'creatingSession' && (
          <div className="card text-center py-10 space-y-4">
            <div className="w-14 h-14 rounded-full border-4 border-cream-deep border-t-saffron
                            animate-spin mx-auto" />
            <p className="text-brew font-semibold">Setting up your session…</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="card text-center py-8 space-y-4">
            <div className="text-4xl">😕</div>
            <div>
              <h2 className="text-xl font-bold text-brew">Detection Failed</h2>
              <p className="text-gray-500 text-sm mt-1">{context.error}</p>
            </div>
            <button className="btn-brand w-full" onClick={retry}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline manual table entry
const ManualTableEntry = ({ onSubmit }) => {
  const ref = useRef('')
  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Table number"
          className="input-base pl-9 py-2.5 text-sm"
          onChange={(e) => { ref.current = e.target.value }}
        />
      </div>
      <button
        className="btn-brand px-4 py-2.5 text-sm"
        onClick={() => ref.current && onSubmit(ref.current.trim())}
      >
        Go
      </button>
    </div>
  )
}

export default TableDetectionPage