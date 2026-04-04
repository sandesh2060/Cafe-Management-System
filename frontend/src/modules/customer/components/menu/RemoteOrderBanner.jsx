// frontend/src/modules/customer/components/menu/RemoteOrderBanner.jsx
//
// ─── REDESIGN: Premium clean style ───────────────────────────────────────────
// Pure Tailwind CSS. No inline style clutter. Clean visual hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useLayoutEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import gsap from 'gsap'
import {
  selectOrderType, selectDeliveryAddress, selectAddressConfirmed,
  setOrderType, openAddressSheet,
} from '@store/slices/remoteOrderSlice'

const IcTruck = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M1 4h9v7H1V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M10 6l3 1.5V11h-3V6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="3.5" cy="12" r="1.2" fill="currentColor"/>
    <circle cx="11.5" cy="12" r="1.2" fill="currentColor"/>
  </svg>
)

const IcPin = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A3.5 3.5 0 004.5 5c0 3 3.5 8 3.5 8s3.5-5 3.5-8A3.5 3.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const IcChev = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const RemoteOrderBanner = ({ isDark: D }) => {
  const dispatch  = useDispatch()
  const orderType = useSelector(selectOrderType)
  const address   = useSelector(selectDeliveryAddress)
  const confirmed = useSelector(selectAddressConfirmed)
  const ref       = useRef(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { y: -6, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.38, ease: 'power3.out', delay: 0.05 }
    )
  }, [])

  const isDelivery  = orderType === 'delivery'
  const addressLine = address?.line1?.trim()
    ? `${address.line1}${address.city ? ', ' + address.city : ''}`
    : null

  return (
    <div
      ref={ref}
      className={[
        'w-full border-b',
        D ? 'border-white/[0.06] bg-[rgba(8,14,11,0.96)]' : 'border-black/[0.06] bg-[rgba(248,253,250,0.97)]',
      ].join(' ')}
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        opacity: 0,
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2 max-w-[600px] mx-auto">

        {/* ── Delivery / Pickup toggle ── */}
        <div className={[
          'flex items-center rounded-xl p-0.5 shrink-0',
          D ? 'bg-white/[0.05] border border-white/[0.07]' : 'bg-black/[0.05] border border-black/[0.07]',
        ].join(' ')}>
          {[
            { type: 'delivery', label: 'Deliver', Ic: IcTruck },
            { type: 'pickup',   label: 'Pickup',  Ic: IcPin   },
          ].map(({ type, label, Ic }) => {
            const on = orderType === type
            return (
              <button
                key={type}
                onClick={() => dispatch(setOrderType(type))}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[9px]',
                  'text-[11.5px] font-semibold transition-all duration-200 select-none',
                  on
                    ? D
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : D
                      ? 'text-white/25 border border-transparent'
                      : 'text-black/25 border border-transparent',
                ].join(' ')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Ic />
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Divider ── */}
        <div className={['w-px h-4 shrink-0', D ? 'bg-white/[0.08]' : 'bg-black/[0.08]'].join(' ')} />

        {/* ── Address / pickup info ── */}
        <button
          onClick={() => dispatch(openAddressSheet())}
          className="flex-1 flex items-center gap-2 min-w-0 text-left group"
          style={{ WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {isDelivery ? (
            addressLine ? (
              <>
                <span className={['text-[11px] font-medium shrink-0', D ? 'text-white/30' : 'text-black/30'].join(' ')}>
                  To
                </span>
                <span className={['text-[12.5px] font-semibold truncate flex-1', D ? 'text-white/80' : 'text-black/75'].join(' ')}>
                  {addressLine}
                </span>
                <span className={['shrink-0 opacity-0 group-hover:opacity-100 transition-opacity', D ? 'text-white/40' : 'text-black/40'].join(' ')}>
                  <IcChev />
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className={['text-[12.5px] font-semibold', D ? 'text-amber-400' : 'text-amber-600'].join(' ')}>
                  Add delivery address
                </span>
                <span className={['shrink-0 ml-auto', D ? 'text-white/25' : 'text-black/25'].join(' ')}>
                  <IcChev />
                </span>
              </>
            )
          ) : (
            <div className="flex items-center gap-2">
              <span className={['text-[12.5px] font-medium', D ? 'text-white/50' : 'text-black/45'].join(' ')}>
                Pick up at venue
              </span>
              {confirmed && (
                <span className={[
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  D
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200',
                ].join(' ')}>
                  Ready
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

export default RemoteOrderBanner