// src/modules/kitchen/components/inventory/InventoryAlerts.jsx
//
// ─── MODULE 20 UPGRADE ────────────────────────────────────────────────────────
// CHANGES from old version:
//   OLD: polled /inventory/alerts (old model — quantity/lowThreshold)
//   NEW: polls /inventory/ingredients/low-stock (Module 20 API)
//        + listens to 3 real-time socket events:
//            inventory:low_stock      → adds/updates alert
//            inventory:critical_stock → adds/updates alert (urgent)
//            inventory:out_of_stock   → adds/updates alert (critical + auto-unavailable)
//
// Alert levels from Module 20 deduction engine:
//   low_stock      → stock ≤ reorderLevel   (amber)
//   critical_stock → stock ≤ criticalLevel  (orange/rose)
//   out_of_stock   → stock ≤ 0              (red + pulses)
//
// Socket room: kitchen staff are already in their cafe room
// via the existing socket.service.js — no new room join needed.
//
// UNCHANGED: onClose prop, overall layout, ThemeContext usage
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import api from '@api/axios'
import { getSocket } from '@shared/services/socket.service'
import { AlertTriangle, X, Zap, PackageX, RefreshCw } from 'lucide-react'

// ── Alert level config ────────────────────────────────────────────────────────
const LEVEL = {
  out_of_stock:   { color: '#F43F5E', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.25)',  label: 'OUT',      pulse: true  },
  critical_stock: { color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', label: 'CRITICAL', pulse: false },
  low_stock:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',  label: 'LOW',      pulse: false },
}

// Sort: out first, then critical, then low
const LEVEL_ORDER = { out_of_stock: 0, critical_stock: 1, low_stock: 2 }

const sortAlerts = (list) =>
  [...list].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])

// ─── Single alert row ─────────────────────────────────────────────────────────
const AlertRow = ({ alert, onDismiss, index }) => {
  const rowRef = useRef(null)
  const cfg    = LEVEL[alert.level] ?? LEVEL.low_stock

  useEffect(() => {
    if (!rowRef.current) return
    gsap.fromTo(rowRef.current,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.25, delay: index * 0.04, ease: 'power2.out' }
    )
    // Pulse animation for out-of-stock
    if (cfg.pulse) {
      gsap.to(rowRef.current, {
        boxShadow: `0 0 0 3px ${cfg.color}30`,
        duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut',
      })
    }
  }, [])

  return (
    <div ref={rowRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 10,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        marginBottom: 6, position: 'relative',
      }}>

      {/* Level badge */}
      <span style={{
        fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
        background: cfg.color, color: '#fff', letterSpacing: '0.08em',
        fontFamily: 'system-ui', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {cfg.label}
      </span>

      {/* Ingredient info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.name}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: cfg.color, fontWeight: 600 }}>
          {alert.stockAfter <= 0
            ? 'Out of stock — items auto-flagged unavailable'
            : `${alert.stockAfter} ${alert.unit} remaining`}
          {alert.reorderLevel > 0 && alert.stockAfter > 0 && ` · reorder at ${alert.reorderLevel}`}
        </p>
      </div>

      {/* Dismiss */}
      <button onClick={() => onDismiss(alert._id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, padding: 3, flexShrink: 0, opacity: 0.7, display: 'flex' }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const InventoryAlerts = ({ onClose }) => {
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [newCount,  setNewCount]  = useState(0)
  const wrapRef  = useRef(null)
  const headerRef = useRef(null)

  // Entrance animation
  useEffect(() => {
    if (wrapRef.current) {
      gsap.fromTo(wrapRef.current,
        { opacity: 0, y: -8, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.5)' }
      )
    }
  }, [])

  // ── Load initial low-stock state from Module 20 API ────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    api.get('/inventory/ingredients/low-stock')
      .then(r => {
        const data = r.data ?? r
        const out      = (data.outOfStock ?? []).map(i => _toAlert(i, 'out_of_stock'))
        const critical = (data.critical   ?? []).map(i => _toAlert(i, 'critical_stock'))
        const low      = (data.low        ?? []).map(i => _toAlert(i, 'low_stock'))
        setAlerts(sortAlerts([...out, ...critical, ...low]))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // ── Socket: listen to Module 20 deduction engine events ───────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handlers = {
      'inventory:out_of_stock':   (data) => _upsertAlert(data, 'out_of_stock'),
      'inventory:critical_stock': (data) => _upsertAlert(data, 'critical_stock'),
      'inventory:low_stock':      (data) => _upsertAlert(data, 'low_stock'),
    }

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn))
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn))
  }, [])

  // Upsert an alert from socket event
  const _upsertAlert = useCallback((data, level) => {
    const ing = data.ingredient ?? data
    const alert = {
      _id:         ing._id,
      name:        ing.name,
      unit:        ing.unit,
      stockAfter:  data.stockAfter ?? ing.currentStock ?? 0,
      reorderLevel: data.reorderLevel ?? ing.reorderLevel ?? 0,
      level,
      receivedAt:  Date.now(),
    }
    setAlerts(prev => {
      const without = prev.filter(a => a._id !== alert._id)
      return sortAlerts([alert, ...without])
    })
    setNewCount(n => n + 1)

    // Flash header on new alert
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { background: `${LEVEL[level].bg}` },
        { background: 'transparent', duration: 0.8, ease: 'power2.out', clearProps: 'background' }
      )
    }
  }, [])

  const dismiss = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a._id !== id))
  }, [])

  // Overall severity — drives header color
  const hasOut      = alerts.some(a => a.level === 'out_of_stock')
  const hasCritical = alerts.some(a => a.level === 'critical_stock')
  const headerColor = hasOut ? LEVEL.out_of_stock.color : hasCritical ? LEVEL.critical_stock.color : LEVEL.low_stock.color
  const headerBg    = hasOut ? LEVEL.out_of_stock.bg    : hasCritical ? LEVEL.critical_stock.bg    : LEVEL.low_stock.bg
  const headerBd    = hasOut ? LEVEL.out_of_stock.border: hasCritical ? LEVEL.critical_stock.border: LEVEL.low_stock.border

  return (
    <div ref={wrapRef}
      style={{
        margin: '0 12px 10px',
        borderRadius: 14,
        border: `1px solid ${alerts.length > 0 ? headerBd : 'var(--card-border)'}`,
        background: alerts.length > 0 ? headerBg : 'var(--card-bg)',
        overflow: 'hidden',
        boxShadow: hasOut ? `0 4px 20px ${LEVEL.out_of_stock.color}20` : 'none',
        transition: 'border-color 0.3s, background 0.3s',
      }}>

      {/* Header */}
      <div ref={headerRef}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: alerts.length > 0 ? `1px solid ${headerBd}` : 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasOut
            ? <PackageX size={15} style={{ color: headerColor, flexShrink: 0 }} />
            : <AlertTriangle size={15} style={{ color: headerColor, flexShrink: 0 }} />
          }
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: alerts.length > 0 ? headerColor : 'var(--text-primary)' }}>
            {alerts.length === 0 ? 'All stock OK' : `${alerts.length} stock alert${alerts.length !== 1 ? 's' : ''}`}
          </p>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'ia-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
          {newCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: headerColor, color: '#fff' }}>
              +{newCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={load}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, display: 'flex' }}>
            <RefreshCw size={12} />
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Alert rows */}
      {alerts.length > 0 && (
        <div style={{ padding: '10px 10px 6px', maxHeight: 260, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading ? (
            <div style={{ padding: '8px 0' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ height: 44, borderRadius: 10, background: 'var(--divider)', marginBottom: 6, animation: 'ia-pulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            alerts.map((alert, i) => (
              <AlertRow key={alert._id} alert={alert} onDismiss={dismiss} index={i} />
            ))
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && (
        <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={13} style={{ color: '#10b981' }} />
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
            All ingredients stocked — deduction engine active
          </p>
        </div>
      )}

      <style>{`
        @keyframes ia-pulse {
          0%,100% { opacity: 1 }
          50%      { opacity: 0.35 }
        }
      `}</style>
    </div>
  )
}

// ── Helper: shape an ingredient from low-stock API into an alert object ────────
const _toAlert = (ingredient, level) => ({
  _id:          ingredient._id,
  name:         ingredient.name,
  unit:         ingredient.unit,
  stockAfter:   ingredient.currentStock,
  reorderLevel: ingredient.reorderLevel,
  level,
  receivedAt:   Date.now(),
})

export default InventoryAlerts