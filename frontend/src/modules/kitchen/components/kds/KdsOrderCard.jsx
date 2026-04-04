// src/modules/kitchen/components/kds/KdsOrderCard.jsx
//
// ─── MODULE 23: KDS Upgrades ──────────────────────────────────────────────────
// ★ Item-level checkboxes — tick each dish as it's plated
// ★ Urgency timer bar — fills red as wait time grows (15m = full red)
// ★ Order type badge — dine-in / remote-delivery / remote-pickup
// ★ Emits kitchen:item-checked socket event per item tick
// ★ All existing GSAP animations, ElapsedTimer, themes — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import socketService     from '@shared/services/socket.service'
import gsap              from 'gsap'
import { Play, CheckCircle, Clock, Truck, MapPin, UtensilsCrossed } from 'lucide-react'

const THEME = {
  yellow: {
    border:  'var(--accent)',
    accent:  'var(--accent-light)',
    badgeBg: 'var(--accent-dim)',
    btnGrad: 'linear-gradient(135deg, var(--warning, #F59E0B), var(--accent))',
  },
  orange: {
    border:  'var(--accent-dark)',
    accent:  'var(--accent)',
    badgeBg: 'var(--accent-dim)',
    btnGrad: 'linear-gradient(135deg, var(--success), #16A34A)',
  },
}

// ── Urgency timer bar ─────────────────────────────────────────────────────────
// Fills from green → amber → red over MAX_MINUTES
const MAX_MINUTES = 20

const UrgencyBar = ({ startTime, color }) => {
  const [pct, setPct] = useState(0)
  const barRef = useRef(null)

  useEffect(() => {
    const update = () => {
      const mins = (Date.now() - new Date(startTime)) / 60000
      const p = Math.min(100, (mins / MAX_MINUTES) * 100)
      setPct(p)
    }
    update()
    const id = setInterval(update, 15_000)
    return () => clearInterval(id)
  }, [startTime])

  // Color: green → amber → red
  const barColor = pct < 40
    ? 'var(--success)'
    : pct < 70
      ? 'var(--warning)'
      : 'var(--danger)'

  return (
    <div style={{
      width: '100%', height: 3, borderRadius: 99,
      background: 'var(--card-border)',
      overflow: 'hidden', marginBottom: 2,
    }}>
      <div
        ref={barRef}
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 99,
          background: barColor,
          transition: 'width 1s linear, background 1s ease',
          // Pulse animation when urgent
          animation: pct >= 80 ? 'kds-pulse 1s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  )
}

// ── Elapsed timer ─────────────────────────────────────────────────────────────
const ElapsedTimer = ({ startTime, warnMinutes = 15 }) => {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const update = () => setMins(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [startTime])

  return (
    <span className="flex items-center gap-1 text-xs font-bold transition-colors"
      style={{ color: mins >= warnMinutes ? 'var(--danger)' : 'var(--text-muted)' }}>
      <Clock size={11} />
      {mins}m
    </span>
  )
}

// ── Order type badge ──────────────────────────────────────────────────────────
const OrderTypeBadge = ({ order }) => {
  const isRemote = order.venueMode === 'remote' || order.isRemote
  const type     = order.orderType  // 'delivery' | 'pickup' | undefined

  if (!isRemote) return (
    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: 'var(--pill-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
      <UtensilsCrossed size={9} /> Dine-in
    </span>
  )

  if (type === 'delivery') return (
    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)' }}>
      <Truck size={9} /> Delivery
    </span>
  )

  return (
    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
      <MapPin size={9} /> Pickup
    </span>
  )
}

// ── Item row with checkbox ────────────────────────────────────────────────────
const ItemRow = ({ item, index, orderId, checked, onCheck }) => {
  const handleCheck = useCallback(() => {
    onCheck(index)
    // ★ Emit per-item socket event so waiter panel can show partial progress
    socketService.emit('kitchen:item-checked', {
      orderId,
      itemIndex: index,
      itemName:  item.name,
      checked:   !checked,
    })
  }, [index, orderId, item.name, checked, onCheck])

  return (
    <div
      className="flex items-start gap-2 cursor-pointer group"
      onClick={handleCheck}
      style={{ opacity: checked ? 0.45 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Checkbox */}
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${checked ? 'var(--success)' : 'var(--card-border)'}`,
        background: checked ? 'var(--success)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5.5L4 8L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight"
          style={{
            color: 'var(--text-primary)',
            textDecoration: checked ? 'line-through' : 'none',
          }}>
          {item.name}
          <span className="ml-1.5 font-black text-xs" style={{ color: 'var(--accent)' }}>
            ×{item.quantity}
          </span>
        </p>
        {item.portionLabel && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.portionLabel}</p>
        )}
        {item.notes && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>📝 {item.notes}</p>
        )}
      </div>
    </div>
  )
}

// ══ Main Card ══════════════════════════════════════════════════════════════════
const KdsOrderCard = ({ order, onStart, onReady, color = 'yellow', isNew = false }) => {
  const { isDark } = useContext(ThemeContext)
  const cardRef    = useRef(null)
  const c          = THEME[color]

  // ★ Track which items are checked off
  const [checkedItems, setCheckedItems] = useState(new Set())

  const totalItems   = order.items?.length ?? 0
  const checkedCount = checkedItems.size
  const allChecked   = totalItems > 0 && checkedCount === totalItems

  const handleItemCheck = useCallback((index) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  // ── GSAP entrance (unchanged) ────────────────────────────────────────────
  useEffect(() => {
    if (!cardRef.current) return
    if (isNew) {
      gsap.fromTo(cardRef.current,
        { scale: 0.85, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }
      )
      gsap.fromTo(cardRef.current,
        { boxShadow: '0 0 0 0 var(--accent-glow)' },
        { boxShadow: '0 0 0 12px transparent', duration: 0.8, delay: 0.2 }
      )
    } else {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )
    }
  }, [])

  // ── Bounce card when an item is checked ──────────────────────────────────
  useEffect(() => {
    if (!cardRef.current || checkedItems.size === 0) return
    gsap.fromTo(cardRef.current,
      { scale: 1 },
      { scale: 1.012, duration: 0.08, ease: 'power2.out', yoyo: true, repeat: 1 }
    )
  }, [checkedItems.size])

  return (
    <>
      <style>{`
        @keyframes kds-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
      <div
        ref={cardRef}
        className="rounded-2xl border-2 flex flex-col gap-2.5 p-4 transition-colors"
        style={{
          borderColor: allChecked ? 'var(--success)' : c.border,
          background:  'var(--card-bg)',
          boxShadow:   '0 4px 20px var(--accent-glow)',
          transition:  'border-color 0.3s',
        }}
      >
        {/* ★ Urgency bar at very top */}
        <UrgencyBar startTime={order.placedAt || order.createdAt} color={color} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-lg font-black text-sm"
              style={{ background: c.badgeBg, color: c.border }}>
              T-{order.tableNumber || '?'}
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--text-disabled)' }}>
              #{order._id?.slice(-4).toUpperCase()}
            </span>
            {/* ★ Order type badge */}
            <OrderTypeBadge order={order} />
          </div>
          <ElapsedTimer startTime={order.placedAt || order.createdAt}
            warnMinutes={color === 'orange' ? 20 : 15} />
        </div>

        {/* ★ Progress indicator */}
        {totalItems > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
              <div style={{
                height: '100%',
                width: `${(checkedCount / totalItems) * 100}%`,
                background: allChecked ? 'var(--success)' : 'var(--accent)',
                borderRadius: 99,
                transition: 'width 0.3s ease, background 0.3s',
              }} />
            </div>
            <span className="text-[10px] font-bold shrink-0"
              style={{ color: allChecked ? 'var(--success)' : 'var(--text-muted)' }}>
              {checkedCount}/{totalItems}
            </span>
          </div>
        )}

        {/* ★ Items with checkboxes */}
        <div className="space-y-2 flex-1">
          {order.items?.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              orderId={order._id}
              checked={checkedItems.has(i)}
              onCheck={handleItemCheck}
            />
          ))}
        </div>

        {/* Special note */}
        {order.specialNote && (
          <div className="text-xs px-2.5 py-1.5 rounded-lg border-l-2"
            style={{ borderColor: c.border, background: c.badgeBg, color: c.accent }}>
            📌 {order.specialNote}
          </div>
        )}

        {/* Delivery address (remote orders) */}
        {order.orderType === 'delivery' && order.deliveryAddress?.line1 && (
          <div className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
            style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Truck size={10} /> {order.deliveryAddress.line1}
            {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
          </div>
        )}

        {/* Action buttons */}
        {onStart && (
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md"
            style={{ background: c.btnGrad, color: 'var(--text-inverse)' }}
          >
            <Play size={14} fill="currentColor" /> Start Preparing
          </button>
        )}
        {onReady && (
          <button
            onClick={onReady}
            disabled={!allChecked}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--success), #16A34A)', color: 'var(--text-inverse)' }}
            title={!allChecked ? `Check off all ${totalItems} items first` : ''}
          >
            <CheckCircle size={14} />
            {allChecked ? 'Ready for Pickup' : `${totalItems - checkedCount} item${totalItems - checkedCount !== 1 ? 's' : ''} remaining`}
          </button>
        )}
      </div>
    </>
  )
}

export default KdsOrderCard