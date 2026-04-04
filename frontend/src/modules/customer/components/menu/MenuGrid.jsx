// src/modules/customer/components/menu/MenuGrid.jsx
//
// ✅ Re-measures scrollMargin on back navigation (window.__scrollRestoring)
//    matching PageTransition's restore timings (rAF, 150ms, 300ms)
// ★ Module 22: accepts getBadge prop, passes pricing badge to each MenuCard

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDeviceTier }  from '@shared/hooks/useDeviceTier'
import { FONTS }          from '@shared/config/brand'
import MenuCard           from './MenuCard'

function getLayout() {
  if (typeof window === 'undefined') return { cols: 2, rowH: 300, gap: 14 }
  const w = window.innerWidth
  if (w >= 1280) return { cols: 5, rowH: 340, gap: 20 }
  if (w >= 1024) return { cols: 4, rowH: 360, gap: 18 }
  if (w >= 640)  return { cols: 3, rowH: 320, gap: 16 }
  return                { cols: 2, rowH: 300, gap: 14 }
}

// ★ CHANGED: accept getBadge prop
export default function MenuGrid({ items, getBadge = null }) {
  const { gsapEnabled } = useDeviceTier()
  const parentRef       = useRef(null)

  const [layout, setLayout] = useState(getLayout)
  useEffect(() => {
    let raf = null
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setLayout(getLayout()))
    }
    window.addEventListener('resize', handler, { passive: true })
    return () => { window.removeEventListener('resize', handler); cancelAnimationFrame(raf) }
  }, [])

  const { cols, rowH, gap } = layout

  const rows = useMemo(() => {
    if (!items?.length) return []
    const out = []
    for (let i = 0; i < items.length; i += cols) out.push(items.slice(i, i + cols))
    return out
  }, [items, cols])

  const getScrollMargin = useCallback(() => {
    if (!parentRef.current) return 0
    return (
      parentRef.current.getBoundingClientRect().top +
      (document.documentElement.scrollTop || window.scrollY)
    )
  }, [])

  const virtualizer = useVirtualizer({
    count:            rows.length,
    getScrollElement: () => document.documentElement,
    estimateSize:     () => rowH + gap,
    overscan:         3,
    scrollMargin:     getScrollMargin(),
  })

  useEffect(() => {
    if (!rows.length) return
    const t = setTimeout(() => {
      virtualizer.options.scrollMargin = getScrollMargin()
      virtualizer.measure()
    }, 150)
    return () => clearTimeout(t)
  }, [items, rows.length]) // eslint-disable-line

  useEffect(() => {
    if (!window.__scrollRestoring) return
    const timers = [50, 160, 320].map(ms =>
      setTimeout(() => {
        virtualizer.options.scrollMargin = getScrollMargin()
        virtualizer.measure()
      }, ms)
    )
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 opacity-55">
        <span className="text-4xl">🍃</span>
        <p
          className="m-0 text-sm font-semibold text-center tracking-[-0.02em]"
          style={{ color: 'var(--text-muted)', fontFamily: FONTS.body }}
        >
          Nothing here yet
        </p>
      </div>
    )
  }

  const totalHeight = virtualizer.getTotalSize()

  return (
    <>
      <div ref={parentRef} style={{ width: '100%' }}>
        <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>

          {virtualizer.getVirtualItems().map(vRow => {
            const rowItems = rows[vRow.index]
            if (!rowItems) return null

            const translateY = vRow.start - virtualizer.options.scrollMargin

            return (
              <div
                key={vRow.key}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position:      'absolute',
                  top:           0,
                  left:          0,
                  width:         '100%',
                  paddingBottom: gap,
                  transform:     `translateY(${translateY}px)`,
                }}
              >
                <div
                  className={[
                    'grid',
                    'grid-cols-2',    'gap-3.5',
                    'sm:grid-cols-3', 'sm:gap-4',
                    'lg:grid-cols-4', 'lg:gap-[18px]',
                    'xl:grid-cols-5', 'xl:gap-5',
                  ].join(' ')}
                >
                  {rowItems.map(item => (
                    <div
                      key={item._id}
                      className="mc mc-wrap"
                      style={gsapEnabled ? {
                        animation: 'mg-in 0.36s cubic-bezier(0.22,1,0.36,1) both',
                      } : undefined}
                    >
                      {/* ★ CHANGED: pass badge from getBadge lookup */}
                      <MenuCard
                        item={item}
                        badge={getBadge ? getBadge(item._id, item.category) : null}
                      />
                    </div>
                  ))}

                  {rowItems.length < cols &&
                    Array.from({ length: cols - rowItems.length }, (_, i) => (
                      <div key={`pad-${i}`} aria-hidden="true" />
                    ))
                  }
                </div>
              </div>
            )
          })}

        </div>
      </div>

      <style>{`
        @keyframes mg-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .mc-wrap { animation: none !important; }
        }
      `}</style>
    </>
  )
}