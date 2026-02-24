// src/modules/table/components/QrScannerOverlay.jsx
import { useEffect, useRef, useState } from 'react'
import jsQR                             from 'jsqr'
import { COLORS }                       from '@colors'
import { CameraOff }                    from 'lucide-react'

const QrScannerOverlay = ({ onScan }) => {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let stream = null

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setActive(true)
        tick()
      } catch (err) {
        setError('Camera not available. Please allow camera access.')
      }
    }

    const tick = () => {
      if (!videoRef.current || !canvasRef.current) return
      const video  = videoRef.current
      const canvas = canvasRef.current
      const ctx    = canvas.getContext('2d')

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code    = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          onScan(code.data)
          return  // Stop scanning after first hit
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    start()

    return () => {
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CameraOff size={32} color={COLORS.brew.soft} />
        <p className="text-sm text-brew-soft">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 relative">
          {/* Corner brackets */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 border-white ${pos}`}
              style={{
                borderTopWidth:    i < 2  ? 3 : 0,
                borderBottomWidth: i >= 2 ? 3 : 0,
                borderLeftWidth:   i % 2 === 0 ? 3 : 0,
                borderRightWidth:  i % 2 === 1 ? 3 : 0,
              }}
            />
          ))}

          {/* Scan line animation */}
          {active && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-saffron animate-scan-line"
              style={{ top: '50%' }}
            />
          )}
        </div>
      </div>

      {active && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span className="text-white/80 text-xs bg-black/40 rounded-full px-3 py-1">
            Align QR code within frame
          </span>
        </div>
      )}
    </div>
  )
}

export default QrScannerOverlay