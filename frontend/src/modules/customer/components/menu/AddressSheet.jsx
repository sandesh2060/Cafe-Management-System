// frontend/src/modules/customer/components/menu/AddressSheet.jsx
//
// ─── NEW FILE ─────────────────────────────────────────────────────────────────
// Bottom sheet for delivery address input.
// Opens when user taps address area in RemoteOrderBanner.
// Saves to remoteOrderSlice on confirm.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useLayoutEffect, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import {
  selectDeliveryAddress, selectAddressSheetOpen,
  setAddress, confirmAddress, closeAddressSheet,
} from '@store/slices/remoteOrderSlice'
import { FONTS } from '@shared/config/brand'

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const IcPin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6C3.5 9.5 8 14.5 8 14.5s4.5-5 4.5-8.5A4.5 4.5 0 008 1.5z"
      stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const IcCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IcX = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

/* ═══════════════════════════════════════════════════════════════════════════════
   ADDRESS SHEET
   ═══════════════════════════════════════════════════════════════════════════════ */
const AddressSheet = ({ isDark }) => {
  const dispatch = useDispatch()
  const open     = useSelector(selectAddressSheetOpen)
  const saved    = useSelector(selectDeliveryAddress)

  const [line1,    setLine1]    = useState(saved?.line1    ?? '')
  const [city,     setCity]     = useState(saved?.city     ?? '')
  const [landmark, setLandmark] = useState(saved?.landmark ?? '')
  const [err,      setErr]      = useState('')

  const overlayRef = useRef(null)
  const sheetRef   = useRef(null)
  const dragY      = useRef(null)

  /* ── Sync with saved address when sheet opens ──────────────────────────── */
  useEffect(() => {
    if (open) {
      setLine1(saved?.line1    ?? '')
      setCity(saved?.city      ?? '')
      setLandmark(saved?.landmark ?? '')
      setErr('')
    }
  }, [open]) // eslint-disable-line

  /* ── GSAP animations ──────────────────────────────────────────────────── */
  useLayoutEffect(() => {
    if (!open || !sheetRef.current || !overlayRef.current) return
    gsap.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    gsap.fromTo(sheetRef.current,
      { y: '100%' },
      { y: '0%', duration: 0.55, ease: 'power4.out' }
    )
  }, [open])

  const closeSheet = () => {
    if (!sheetRef.current || !overlayRef.current) { dispatch(closeAddressSheet()); return }
    gsap.to(sheetRef.current,  { y: '100%', duration: 0.32, ease: 'power3.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, delay: 0.06,
      onComplete: () => dispatch(closeAddressSheet()) })
  }

  /* ── Touch drag to dismiss ─────────────────────────────────────────────── */
  const onTS = (e) => { dragY.current = e.touches[0].clientY }
  const onTM = (e) => {
    if (dragY.current == null || !sheetRef.current) return
    const dy = Math.max(0, e.touches[0].clientY - dragY.current)
    gsap.set(sheetRef.current, { y: dy })
  }
  const onTE = (e) => {
    if (dragY.current == null) return
    const dy = e.changedTouches[0].clientY - dragY.current
    dragY.current = null
    if (dy > 90) closeSheet()
    else gsap.to(sheetRef.current, { y: 0, duration: 0.45, ease: 'elastic.out(1, 0.6)' })
  }

  /* ── Confirm ──────────────────────────────────────────────────────────── */
  const handleConfirm = () => {
    if (!line1.trim()) { setErr('Please enter your address'); return }
    dispatch(setAddress({ line1: line1.trim(), city: city.trim(), landmark: landmark.trim() }))
    dispatch(confirmAddress())
    closeSheet()
  }

  if (!open) return null

  const bg      = isDark ? 'rgba(10,20,16,0.98)' : 'rgba(248,252,250,0.99)'
  const bdr     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const textPri = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
  const textMut = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px',
    borderRadius: 14,
    border: `1.5px solid ${bdr}`,
    background: inputBg,
    color: textPri,
    fontSize: 15,
    fontFamily: FONTS.body,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[120] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) closeSheet() }}
    >
      <div
        ref={sheetRef}
        onTouchStart={onTS}
        onTouchMove={onTM}
        onTouchEnd={onTE}
        className="w-full max-w-[520px] rounded-t-[28px] overflow-hidden will-change-transform"
        style={{
          background: bg,
          border: `1px solid ${bdr}`,
          paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
              <IcPin />
            </div>
            <div>
              <h3 className="text-[17px] font-bold leading-tight"
                style={{ color: textPri, fontFamily: FONTS.body }}>
                Delivery address
              </h3>
              <p className="text-[11px]" style={{ color: textMut, fontFamily: FONTS.body }}>
                Where should we deliver?
              </p>
            </div>
          </div>
          <button
            onClick={closeSheet}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150"
            style={{ background: inputBg, color: textMut, border: `1px solid ${bdr}` }}>
            <IcX />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 flex flex-col gap-3">

          {/* Street address */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5"
              style={{ color: textMut, fontFamily: FONTS.body }}>
              Street / Area *
            </label>
            <input
              type="text"
              placeholder="e.g. Thamel, Boudha, Koteshwor…"
              value={line1}
              onChange={(e) => { setLine1(e.target.value); setErr('') }}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5"
              style={{ color: textMut, fontFamily: FONTS.body }}>
              City
            </label>
            <input
              type="text"
              placeholder="e.g. Kathmandu"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5"
              style={{ color: textMut, fontFamily: FONTS.body }}>
              Landmark (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. near Durbar Marg temple"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {err && (
            <p className="text-[12px] font-medium" style={{ color: '#dc2626', fontFamily: FONTS.body }}>
              {err}
            </p>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 rounded-2xl
                       text-[14px] font-bold text-white mt-2
                       active:scale-[0.97] will-change-transform transition-transform duration-100"
            style={{
              padding: '15px 20px',
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              boxShadow: '0 6px 24px rgba(5,150,105,0.3)',
              fontFamily: FONTS.body,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <IcCheck />
            Confirm address
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AddressSheet