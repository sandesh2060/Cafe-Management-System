// src/modules/customer/components/menu/MenuGrid.jsx
import { useRef, useEffect, useContext } from 'react'
import gsap                              from 'gsap'
import { ThemeContext }                  from '@shared/context/ThemeContext'
import MenuCard                          from './MenuCard'

/* ── Skeleton card ────────────────────────────────────────────────────────── */
const SkeletonCard = ({ index = 0 }) => {
  const { isDark: D } = useContext(ThemeContext)

  const shimmerBase  = D ? 'rgba(255,255,255,0.04)' : 'rgba(18,13,6,0.04)'
  const shimmerMid   = D ? 'rgba(255,255,255,0.08)' : 'rgba(18,13,6,0.07)'

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        boxShadow: D
          ? '0 2px 16px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(92,51,23,0.05)',
        animationDelay: `${index * 80}ms`,
      }}
      aria-hidden="true"
    >
      {/* Image skeleton */}
      <div style={{
        height: 120,
        background: `linear-gradient(90deg, ${shimmerBase} 0%, ${shimmerMid} 50%, ${shimmerBase} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'mc-shimmer 1.6s ease-in-out infinite',
      }} />

      {/* Content skeleton */}
      <div style={{ padding: '10px 10px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <div style={{
          height: 11, borderRadius: 6, width: '78%',
          background: `linear-gradient(90deg, ${shimmerBase} 0%, ${shimmerMid} 50%, ${shimmerBase} 100%)`,
          backgroundSize: '200% 100%',
          animation: `mc-shimmer 1.6s ease-in-out infinite`,
          animationDelay: `${index * 80 + 60}ms`,
        }} />
        <div style={{
          height: 9, borderRadius: 6, width: '52%',
          background: `linear-gradient(90deg, ${shimmerBase} 0%, ${shimmerMid} 50%, ${shimmerBase} 100%)`,
          backgroundSize: '200% 100%',
          animation: `mc-shimmer 1.6s ease-in-out infinite`,
          animationDelay: `${index * 80 + 100}ms`,
        }} />

        {/* Price + button row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <div style={{
            height: 14, width: 38, borderRadius: 6,
            background: `linear-gradient(90deg, ${shimmerBase} 0%, ${shimmerMid} 50%, ${shimmerBase} 100%)`,
            backgroundSize: '200% 100%',
            animation: `mc-shimmer 1.6s ease-in-out infinite`,
            animationDelay: `${index * 80 + 80}ms`,
          }} />
          <div style={{
            width: 32, height: 32, borderRadius: 11,
            background: `linear-gradient(90deg, ${shimmerBase} 0%, ${shimmerMid} 50%, ${shimmerBase} 100%)`,
            backgroundSize: '200% 100%',
            animation: `mc-shimmer 1.6s ease-in-out infinite`,
            animationDelay: `${index * 80 + 120}ms`,
          }} />
        </div>
      </div>

      <style>{`
        @keyframes mc-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
const EmptyState = ({ isSearch }) => {
  const { isDark: D } = useContext(ThemeContext)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '56px 24px 32px',
      textAlign: 'center', gap: 14,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: D ? 'rgba(255,255,255,0.05)' : 'rgba(18,13,6,0.04)',
        border: `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(237,217,184,0.7)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38,
      }}>
        {isSearch ? '🔍' : '🍽️'}
      </div>
      <div>
        <p style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 16, fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: 0,
          transition: 'color var(--transition-theme)',
        }}>
          {isSearch ? 'Nothing found' : 'Empty here'}
        </p>
        <p style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 12, color: 'var(--text-muted)',
          marginTop: 5, lineHeight: 1.5,
          transition: 'color var(--transition-theme)',
        }}>
          {isSearch
            ? 'Try a different keyword or browse categories'
            : 'Try a different category'}
        </p>
      </div>
    </div>
  )
}

/* ── MenuGrid ─────────────────────────────────────────────────────────────── */
const MenuGrid = ({ items = [], loading = false, isSearch = false }) => {
  const gridRef = useRef(null)

  useEffect(() => {
    if (loading || !items.length || !gridRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cards = gridRef.current.querySelectorAll('.mc')
    if (!cards.length) return

    gsap.fromTo(cards,
      { y: 28, opacity: 0, scale: 0.94 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.4, stagger: 0.055,
        ease: 'power2.out',
        force3D: true, clearProps: 'all',
      }
    )
  }, [loading, items.length])

  /* Skeleton loading */
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
        aria-label="Loading menu items"
        aria-busy="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    )
  }

  /* Empty state */
  if (!items.length) {
    return <EmptyState isSearch={isSearch} />
  }

  return (
    <div
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}
      aria-label={`${items.length} menu items`}
    >
      {items.map((item) => (
        <MenuCard key={item._id} item={item} />
      ))}
    </div>
  )
}

export default MenuGrid