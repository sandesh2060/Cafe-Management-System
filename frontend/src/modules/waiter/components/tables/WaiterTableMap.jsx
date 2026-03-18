// src/modules/waiter/components/tables/WaiterTableMap.jsx
//
// ✅ Tailwind gray dark conditionals → var(--card-bg), var(--card-border), var(--text-*)
// ✅ ZONE_META colors are semantic zone indicator colors — intentionally kept fixed
// ✅ Skeleton uses .skeleton class from globals.css

import { useState, useEffect, useContext } from 'react'
import api             from '@api/axios'
import { ThemeContext } from '@shared/context/ThemeContext'
import { Map }          from 'lucide-react'

// Semantic zone colors — fixed, not brand-themed
const ZONE_META = {
  Indoor:  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  Outdoor: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  Terrace: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  Bar:     { color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
}
const DEFAULT_ZONE = { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' }

const WaiterTableMap = () => {
  const [tables,  setTables]  = useState([])
  const [loading, setLoading] = useState(true)
  const { isDark } = useContext(ThemeContext)

  useEffect(() => {
    api.get('/tables')
      .then(d => setTables(d.tables || d.data?.tables || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const zones = [...new Set(tables.map(t => t.zone).filter(Boolean))]
  if (!zones.length && tables.length) zones.push('All')

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      // ✅ var(--card-bg/border/shadow)
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid var(--divider)',
      }}>
        {/* Semantic purple for map icon */}
        <Map size={17} style={{ color: '#8B5CF6' }} />
        <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-body)' }}>
          Tables
        </h2>
        <span style={{ fontSize: 12, marginLeft: 'auto', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          {tables.length} total
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[...Array(10)].map((_, i) => (
            // ✅ .skeleton class from globals.css
            <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {zones.map(zone => {
            const zoneTables = zone === 'All' ? tables : tables.filter(t => t.zone === zone)
            const meta = ZONE_META[zone] || DEFAULT_ZONE
            return (
              <div key={zone}>
                {/* Zone header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                  <p style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: meta.color, margin: 0, fontFamily: 'var(--font-body)',
                  }}>
                    {zone}
                  </p>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 99, fontWeight: 500,
                    // ✅ var(--pill-bg/text-muted)
                    background: 'var(--pill-bg)', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {zoneTables.length}
                  </span>
                </div>

                {/* Table grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {zoneTables.map((t, i) => (
                    <div
                      key={t._id}
                      style={{
                        aspectRatio: '1', borderRadius: 12,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, cursor: 'default',
                        background: meta.bg, color: meta.color,
                        border: `1.5px solid ${meta.color}44`,
                        transition: 'transform 0.15s',
                        fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}
                    >
                      <span style={{ fontSize: 12, fontWeight: 900 }}>{t.tableNumber}</span>
                      <span style={{ fontSize: 8, opacity: 0.7 }}>{t.capacity}p</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WaiterTableMap