// src/modules/customer/pages/OrderHistoryPage.jsx
// Route: /order/history
//
// Premium order history page — timeline of all past orders.
// Clicking any order navigates to /order/status?id=<orderId> (detail view).
// GSAP entrance animations, pull-to-refresh, infinite scroll pagination.
// Fully wired to Redux orderSlice + backend GET /api/orders/history

import {
  useEffect, useRef, useState, useCallback,
  useContext, useMemo,
} from 'react'
import { useNavigate }              from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import gsap                         from 'gsap'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { selectUser }               from '@store/slices/authSlice'
import {
  fetchOrderHistory,
  selectOrderHistory,
  selectOrderLoading,
  selectOrderPagination,
}                                   from '@store/slices/orderSlice'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-NP').format(n ?? 0)

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-NP', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const fmtDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-NP', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

const groupByDate = (orders) => {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1)

  const groups = {}
  orders.forEach((o) => {
    const d = new Date(o.createdAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label
    if (day >= today)     label = 'Today'
    else if (day >= yest) label = 'Yesterday'
    else                  label = fmtDate(o.createdAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(o)
  })
  return groups
}

const STATUS_CFG = {
  pending:    { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending'   },
  preparing:  { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Preparing' },
  on_the_way: { color: '#F97316', bg: 'rgba(249,115,22,0.12)',  label: 'On Way'    },
  delivered:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Delivered' },
  paid:       { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Paid'      },
  cancelled:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelled' },
}
const DEFAULT_STATUS = { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Unknown' }

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 16, padding: '16px 16px 14px',
  }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="ohs-skel" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="ohs-skel" style={{ height: 11, width: '45%', borderRadius: 6 }} />
        <div className="ohs-skel" style={{ height: 10, width: '30%', borderRadius: 6 }} />
        <div className="ohs-skel" style={{ height: 10, width: '70%', borderRadius: 6, marginTop: 4 }} />
      </div>
      <div className="ohs-skel" style={{ width: 52, height: 22, borderRadius: 8, flexShrink: 0 }} />
    </div>
  </div>
)

// ── Order card ────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onTap }) => {
  const ref    = useRef(null)
  const cfg    = STATUS_CFG[order.status] ?? DEFAULT_STATUS
  const items  = order.items ?? []
  const names  = items.slice(0, 2).map(i => i.name ?? 'Item').join(', ')
  const extra  = items.length > 2 ? ` +${items.length - 2}` : ''

  const press   = () => gsap.to(ref.current, { scale: 0.975, duration: 0.1, ease: 'power2.out' })
  const release = () => gsap.to(ref.current, { scale: 1, duration: 0.32, ease: 'back.out(2.5)' })

  return (
    <div
      ref={ref}
      className="ohs-card"
      onClick={() => onTap(order._id)}
      onMouseDown={press} onMouseUp={release} onMouseLeave={release}
      onTouchStart={press} onTouchEnd={release} onTouchCancel={release}
      style={{ padding: '15px 16px 13px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: cfg.bg,
          border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {order.status === 'paid' || order.status === 'delivered' ? '✅'
            : order.status === 'cancelled' ? '❌'
            : order.status === 'preparing' ? '👨‍🍳'
            : order.status === 'on_the_way' ? '🏃'
            : '📋'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: "'Sora', sans-serif",
            }}>
              #{order._id?.slice(-6).toUpperCase()}
            </span>
            <span style={{
              fontSize: 9.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: cfg.color,
              background: cfg.bg,
              padding: '2px 7px', borderRadius: 6,
              border: `1px solid ${cfg.color}30`,
            }}>
              {cfg.label}
            </span>
            {order.tableNumber && (
              <span style={{
                fontSize: 10, color: 'var(--text-muted)', fontWeight: 500,
              }}>
                🪑 {order.tableNumber}
              </span>
            )}
          </div>

          <p style={{
            margin: '5px 0 0', fontSize: 12,
            color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {names}{extra}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              {timeAgo(order.createdAt)}
            </span>
            {(order.pointsEarned ?? 0) > 0 && (
              <span style={{ fontSize: 10.5, color: '#F59E0B', fontWeight: 600 }}>
                ⚡ +{order.pointsEarned} pts
              </span>
            )}
          </div>
        </div>

        {/* Total */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{
            fontSize: 15, fontWeight: 800,
            color: 'var(--accent)',
            fontFamily: "'Sora', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            Rs {fmt(order.total ?? order.totalAmount ?? 0)}
          </span>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────────
const StatsStrip = ({ orders }) => {
  const total   = orders.reduce((s, o) => s + (o.total ?? o.totalAmount ?? 0), 0)
  const avg     = orders.length ? Math.round(total / orders.length) : 0
  const points  = orders.reduce((s, o) => s + (o.pointsEarned ?? 0), 0)

  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 16,
    }}>
      {[
        { label: 'Orders',  value: orders.length,  emoji: '📋' },
        { label: 'Spent',   value: `Rs ${fmt(total)}`, emoji: '💰' },
        { label: 'Avg',     value: `Rs ${fmt(avg)}`, emoji: '📊' },
        { label: 'Points',  value: `+${fmt(points)}`, emoji: '⚡' },
      ].map(({ label, value, emoji }) => (
        <div key={label} style={{
          flex: 1,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 13, padding: '10px 8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 5 }}>{emoji}</div>
          <div style={{
            fontSize: 11, fontWeight: 800,
            color: 'var(--accent)',
            fontFamily: "'Sora', sans-serif",
            letterSpacing: '-0.01em',
          }}>
            {value}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ onBrowse }) => {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.5)', delay: 0.2 }
    )
  }, [])
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '52px 24px 40px' }}>
      <div style={{ fontSize: 54, lineHeight: 1, marginBottom: 14 }}>🍽️</div>
      <h3 style={{
        margin: '0 0 8px', fontSize: 17, fontWeight: 800,
        color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif",
      }}>
        No orders yet
      </h3>
      <p style={{
        margin: '0 0 22px', fontSize: 13.5,
        color: 'var(--text-muted)', lineHeight: 1.65,
      }}>
        Your order history will appear here after your first order.
      </p>
      <button
        onClick={onBrowse}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '12px 22px', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 700,
          fontFamily: "'Sora', sans-serif",
          boxShadow: '0 4px 16px var(--accent-glow)',
        }}
      >
        Browse Menu
      </button>
    </div>
  )
}

// ── Back icon ─────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

// ══ Main page ══════════════════════════════════════════════════════════════════
export default function OrderHistoryPage() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)
  const D          = isDark

  const user       = useSelector(selectUser)
  const orders     = useSelector(selectOrderHistory)
  const loading    = useSelector(selectOrderLoading)
  const pagination = useSelector(selectOrderPagination)

  const headerRef   = useRef(null)
  const listRef     = useRef(null)
  const sentinelRef = useRef(null)
  const scrollCtx   = useRef(null)

  const hasMore = pagination
    ? (pagination.page ?? 1) < (pagination.totalPages ?? 1)
    : false

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchOrderHistory({ page: 1, limit: 15 }))
  }, [dispatch])

  // ── Header entrance ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(
      headerRef.current.querySelectorAll('.hdr-el'),
      { opacity: 0, y: -14 },
      { opacity: 1, y: 0, stagger: 0.055, duration: 0.48, ease: 'power3.out' }
    )
  }, [])

  // ── Card stagger on load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!listRef.current || loading) return
    const cards = listRef.current.querySelectorAll('.ohs-card:not(.gsap-done)')
    if (!cards.length) return
    gsap.fromTo(cards,
      { opacity: 0, y: 22, scale: 0.975 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.05, duration: 0.44, ease: 'back.out(1.4)' }
    )
    cards.forEach(c => c.classList.add('gsap-done'))
  }, [orders, loading])

  // ── Infinite scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        dispatch(fetchOrderHistory({ page: (pagination?.page ?? 1) + 1, limit: 15 }))
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, pagination, dispatch])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleTap = useCallback((orderId) => {
    navigate(`/order/status?id=${orderId}`)
  }, [navigate])

  const handleRefresh = useCallback(() => {
    dispatch(fetchOrderHistory({ page: 1, limit: 15 }))
  }, [dispatch])

  // ── Grouped orders ───────────────────────────────────────────────────────────
  const grouped = useMemo(() => groupByDate(orders), [orders])

  // ── CSS vars ──────────────────────────────────────────────────────────────────
  const cssVars = D ? {
    '--bg':               '#080C14',
    '--card-bg':          'rgba(12,20,32,0.96)',
    '--card-border':      'rgba(255,255,255,0.07)',
    '--header-bg':        'rgba(8,12,20,0.92)',
    '--text-primary':     '#EFF6FF',
    '--text-secondary':   '#A8BDD8',
    '--text-muted':       'rgba(168,189,216,0.50)',
    '--accent':           '#38BDF8',
    '--accent-dark':      '#0284C7',
    '--accent-glow':      'rgba(56,189,248,0.28)',
    '--divider':          'rgba(255,255,255,0.07)',
    '--skel-base':        'rgba(255,255,255,0.05)',
    '--skel-shine':       'rgba(255,255,255,0.09)',
  } : {
    '--bg':               '#EEF5FF',
    '--card-bg':          '#FFFFFF',
    '--card-border':      'rgba(14,165,233,0.10)',
    '--header-bg':        'rgba(238,245,255,0.92)',
    '--text-primary':     '#0B1929',
    '--text-secondary':   '#2A4668',
    '--text-muted':       'rgba(42,70,104,0.52)',
    '--accent':           '#0284C7',
    '--accent-dark':      '#0369A1',
    '--accent-glow':      'rgba(2,132,199,0.22)',
    '--divider':          'rgba(14,165,233,0.10)',
    '--skel-base':        'rgba(14,165,233,0.06)',
    '--skel-shine':       'rgba(14,165,233,0.12)',
  }

  const showEmpty = !loading && orders.length === 0

  return (
    <div style={{
      ...cssVars,
      minHeight: '100dvh',
      background: 'var(--bg)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        .ohs-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          will-change: transform;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .ohs-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.10);
          border-color: var(--accent-dark, #0284C7);
        }

        .ohs-skel {
          background: linear-gradient(
            90deg,
            var(--skel-base) 0%,
            var(--skel-shine) 50%,
            var(--skel-base) 100%
          );
          background-size: 200% 100%;
          animation: ohs-shimmer 1.5s linear infinite;
        }
        @keyframes ohs-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ohs-header {
          position: sticky; top: 0; z-index: 100;
          background: var(--header-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--divider);
        }

        .ohs-group-label {
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.14em;
          color: var(--text-muted);
          padding: 14px 0 8px;
          font-family: 'Sora', sans-serif;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 99px; }
      `}</style>

      {/* ── Header ── */}
      <header ref={headerRef} className="ohs-header">
        <div style={{
          maxWidth: 600, margin: '0 auto',
          padding: '13px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            className="hdr-el"
            onClick={() => navigate('/menu')}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', outline: 'none',
            }}
          >
            <BackIcon />
          </button>

          <div className="hdr-el" style={{ flex: 1 }}>
            <h1 style={{
              margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1,
              color: 'var(--text-primary)',
              fontFamily: "'Sora', sans-serif",
            }}>
              Order History
            </h1>
            {orders.length > 0 && (
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <button
            className="hdr-el"
            onClick={handleRefresh}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', outline: 'none',
              transition: 'transform 0.3s',
            }}
            onMouseDown={(e) => gsap.to(e.currentTarget, { rotate: 180, duration: 0.4, ease: 'power2.out' })}
            onMouseUp={(e) => gsap.to(e.currentTarget, { rotate: 0, duration: 0.4, ease: 'power2.out' })}
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{
        maxWidth: 600, margin: '0 auto',
        padding: '16px 14px 100px',
      }}>

        {/* Stats strip — only when we have enough orders */}
        {orders.length >= 3 && (
          <StatsStrip orders={orders} />
        )}

        {/* Skeleton loading */}
        {loading && orders.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <EmptyState onBrowse={() => navigate('/menu')} />
        )}

        {/* Grouped order list */}
        <div ref={listRef}>
          {Object.entries(grouped).map(([dateLabel, dayOrders]) => (
            <div key={dateLabel}>
              <div className="ohs-group-label">{dateLabel}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {dayOrders.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onTap={handleTap}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination loading */}
        {loading && orders.length > 0 && (
          <div style={{
            textAlign: 'center', padding: '14px 0',
            fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
          }}>
            Loading more…
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* End label */}
        {!hasMore && orders.length > 3 && !loading && (
          <div style={{
            textAlign: 'center', padding: '20px 0 8px',
            fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500,
          }}>
            — {orders.length} order{orders.length !== 1 ? 's' : ''} total —
          </div>
        )}
      </main>
    </div>
  )
}