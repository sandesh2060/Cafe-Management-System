// frontend/src/modules/manager/components/feedback/FeedbackPanel.jsx
//
// Module 21 — Manager Feedback Panel
// Tabs: Analytics | All Feedback | Per-Item Ratings
//
// Fits into ManagerDashboard the same way InventoryPanel does —
// imported in Section PANELS map under key 'feedback'.
// Design matches ManagerDashboard P palette + FONTS.

import { useState, useEffect, useCallback, useRef, useContext, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { FONTS } from '@shared/config/brand'
import { COLORS } from '@colors'
import api from '@api/axios'
import {
  BarChart3, MessageSquare, Star, TrendingUp,
  RefreshCw, ChevronDown, ThumbsUp, ThumbsDown,
  Minus, Eye, EyeOff, Filter,
} from 'lucide-react'

// ── Local design tokens (matches ManagerDashboard) ────────────────────────────
const P = {
  orange: '#FF5500', green: '#22C55E', blue: '#6366F1',
  amber: '#F59E0B', rose: '#F43F5E', teal: '#14B8A6',
}
const dk = (d, dark, light) => d ? dark : light

const cardSt = (isDark) => ({
  background:   dk(isDark, '#161210', '#FFFFFF'),
  border:       `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`,
  borderRadius: 16,
  boxShadow:    isDark ? '0 1px 4px rgba(0,0,0,0.45)' : '0 2px 12px rgba(60,20,0,0.08)',
})

const Skeleton = ({ isDark, h = 48, n = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ height: h, borderRadius: 10, background: dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'), animation: 'fb-pulse 1.4s ease-in-out infinite' }} />
    ))}
  </div>
)

const Empty = ({ label, isDark }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
    <MessageSquare size={28} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), margin: '0 auto 10px', opacity: 0.3 }} />
    <p style={{ margin: 0, fontSize: 13, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{label}</p>
  </div>
)

// ── Star display ──────────────────────────────────────────────────────────────
const Stars = ({ rating, size = 11 }) => {
  const n = Math.round(rating ?? 0)
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= n ? '#F59E0B' : 'none'}
          stroke={i <= n ? '#F59E0B' : 'var(--divider)'}
          strokeWidth="1.8">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  )
}

// ── NPS gauge ────────────────────────────────────────────────────────────────
const NpsGauge = ({ score, isDark }) => {
  if (score === null || score === undefined) return (
    <p style={{ fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>No NPS data yet</p>
  )
  const color = score >= 50 ? P.green : score >= 0 ? P.amber : P.rose
  const label = score >= 50 ? 'Excellent' : score >= 0 ? 'Good' : 'Needs work'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color, fontFamily: FONTS.body, lineHeight: 1, letterSpacing: '-1px' }}>
          {score > 0 ? `+${score}` : score}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONTS.body }}>
          {label}
        </p>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: 6, borderRadius: 99, background: dk(isDark, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.07)'), overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (score + 100) / 2))}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>Range: -100 to +100</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1: Analytics
═══════════════════════════════════════════════════════════════════════════ */
function AnalyticsTab({ isDark }) {
  const [data, setData]     = useState(null)
  const [days, setDays]     = useState(30)
  const [loading, setLoading] = useState(true)
  const barsRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/feedback/analytics?days=${days}`)
      .then(r => setData(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!barsRef.current || !data) return
    const fills = barsRef.current.querySelectorAll('.fb-bar')
    gsap.fromTo(fills, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.6, stagger: 0.06, ease: 'power2.out' })
  }, [data])

  const overall = data?.overall
  const nps     = data?.nps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: `1px solid ${days === d ? P.orange : dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`,
              background: days === d ? `${P.orange}14` : 'transparent',
              color: days === d ? P.orange : dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body,
            }}>
            {d}d
          </button>
        ))}
      </div>

      {loading ? <Skeleton isDark={isDark} h={80} n={3} /> : !data ? <Empty label="No analytics data" isDark={isDark} /> : (
        <>
          {/* Overall rating */}
          <div style={{ ...cardSt(isDark), padding: 18 }}>
            <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>Overall rating</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: P.amber, fontFamily: FONTS.body, lineHeight: 1, letterSpacing: '-1px' }}>
                  {overall?.avg?.toFixed(1) ?? '—'}
                </p>
                <Stars rating={overall?.avg ?? 0} size={14} />
                <p style={{ margin: '4px 0 0', fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{overall?.total ?? 0} reviews</p>
              </div>
              <div ref={barsRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[5,4,3,2,1].map((star, i) => {
                  const count = overall?.distribution?.[i] ?? 0
                  const pct   = overall?.total > 0 ? (count / overall.total) * 100 : 0
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, width: 8, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{star}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 99, background: dk(isDark, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.07)'), overflow: 'hidden' }}>
                        <div className="fb-bar" style={{ height: '100%', width: `${pct}%`, background: P.amber, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 9, width: 16, textAlign: 'right', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* NPS */}
          <div style={{ ...cardSt(isDark), padding: 18 }}>
            <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>Net Promoter Score</p>
            <NpsGauge score={nps?.score ?? null} isDark={isDark} />
            {nps && (
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Promoters',  count: nps.promoters,  color: P.green, Icon: ThumbsUp   },
                  { label: 'Passives',   count: nps.passives,   color: P.amber, Icon: Minus       },
                  { label: 'Detractors', count: nps.detractors, color: P.rose,  Icon: ThumbsDown  },
                ].map(({ label, count, color, Icon }) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: `${color}10`, border: `1px solid ${color}20` }}>
                    <Icon size={14} style={{ color, margin: '0 auto 4px' }} />
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color, fontFamily: FONTS.body }}>{count}</p>
                    <p style={{ margin: 0, fontSize: 9, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top tags */}
          {data.topTags?.length > 0 && (
            <div style={{ ...cardSt(isDark), padding: 18 }}>
              <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>Top feedback tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.topTags.map(({ tag, count }) => (
                  <span key={tag} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: `${P.blue}12`, border: `1px solid ${P.blue}25`, color: P.blue,
                    fontFamily: FONTS.body,
                  }}>
                    {tag.replace(/_/g, ' ')} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent comments */}
          {data.recentComments?.length > 0 && (
            <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
              <p style={{ margin: 0, padding: '14px 16px 10px', fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body, borderBottom: `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.1)')}` }}>
                Recent comments
              </p>
              {data.recentComments.map((fb, i) => (
                <div key={fb._id} style={{ padding: '12px 16px', borderBottom: i < data.recentComments.length - 1 ? `1px solid ${dk(isDark, 'rgba(255,85,0,0.06)', 'rgba(100,50,10,0.07)')}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${P.orange}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: P.orange, flexShrink: 0 }}>
                      {(fb.customerId?.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body, flex: 1 }}>
                      {fb.customerId?.name ?? 'Customer'}
                    </p>
                    <Stars rating={fb.overallRating} size={10} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{fb.comment}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2: All Feedback
═══════════════════════════════════════════════════════════════════════════ */
function AllFeedbackTab({ isDark }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [ratingF,  setRatingF]  = useState('')
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const [expanded, setExpanded] = useState(null)
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: LIMIT }
    if (ratingF) params.rating = ratingF
    api.get('/feedback', { params })
      .then(r => {
        const d = r.data ?? r
        setItems(d.feedbacks ?? [])
        setTotal(d.pagination?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, ratingF])

  useEffect(() => { load() }, [load])

  const hide = async (id, vis) => {
    await api.patch(`/feedback/${id}/visibility`, { isVisible: vis }).catch(() => {})
    load()
  }

  const pages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={ratingF} onChange={e => { setRatingF(e.target.value); setPage(1) }}
          style={{
            padding: '8px 12px', borderRadius: 10, fontSize: 12, fontFamily: FONTS.body,
            background: dk(isDark, COLORS.dark.surface2, COLORS.cream.DEFAULT),
            border: `1.5px solid ${dk(isDark, COLORS.dark.border, COLORS.cream.border)}`,
            color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT),
            cursor: 'pointer',
          }}>
          <option value="">All ratings</option>
          {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} stars</option>)}
        </select>
        <button onClick={load} style={{
          padding: '8px 12px', borderRadius: 10, border: `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`,
          background: 'transparent', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={12} />
        </button>
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {loading ? <Skeleton isDark={isDark} h={56} n={5} /> : items.length === 0 ? <Empty label="No feedback yet" isDark={isDark} /> : (
          items.map((fb, i) => (
            <div key={fb._id} style={{ borderBottom: i < items.length - 1 ? `1px solid ${dk(isDark, 'rgba(255,85,0,0.06)', 'rgba(100,50,10,0.07)')}` : 'none' }}>
              <div onClick={() => setExpanded(expanded === fb._id ? null : fb._id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.025)')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${P.orange}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: P.orange, flexShrink: 0 }}>
                  {(fb.customerId?.name?.[0] ?? '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>{fb.customerId?.name ?? 'Customer'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Stars rating={fb.overallRating} size={10} />
                    {fb.npsScore !== null && fb.npsScore !== undefined && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: fb.npsScore >= 9 ? P.green : fb.npsScore >= 7 ? P.amber : P.rose, fontFamily: FONTS.body }}>
                        NPS: {fb.npsScore}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                    {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <button onClick={e => { e.stopPropagation(); hide(fb._id, !fb.isVisible) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), padding: 3, display: 'flex' }}>
                    {fb.isVisible ? <Eye size={12} /> : <EyeOff size={12} style={{ color: P.rose }} />}
                  </button>
                  <ChevronDown size={12} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), transform: expanded === fb._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {expanded === fb._id && (
                <div style={{ padding: '0 16px 14px 60px' }}>
                  {fb.tags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {fb.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${P.blue}10`, border: `1px solid ${P.blue}20`, color: P.blue, fontFamily: FONTS.body }}>
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {fb.comment && (
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{fb.comment}"
                    </p>
                  )}
                  {fb.itemRatings?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {fb.itemRatings.map((ir, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{ir.emoji ?? '🍽️'}</span>
                          <p style={{ flex: 1, margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>{ir.name}</p>
                          <Stars rating={ir.rating} size={10} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`, background: 'transparent', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), cursor: 'pointer', fontSize: 11, fontFamily: FONTS.body, opacity: page <= 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, alignSelf: 'center' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`, background: 'transparent', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), cursor: 'pointer', fontSize: 11, fontFamily: FONTS.body, opacity: page >= pages ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3: Per-Item Ratings
═══════════════════════════════════════════════════════════════════════════ */
function ItemRatingsTab({ isDark }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [sort,    setSort]    = useState('rating')

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/feedback/items?sort=${sort}&limit=30`)
      .then(r => setItems(r.summaries ?? r.data?.summaries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sort])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'flex-end' }}>
        {[{ key: 'rating', label: 'By rating' }, { key: 'count', label: 'By volume' }].map(s => (
          <button key={s.key} onClick={() => setSort(s.key)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: `1px solid ${sort === s.key ? P.orange : dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`,
              background: sort === s.key ? `${P.orange}14` : 'transparent',
              color: sort === s.key ? P.orange : dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.1)')}` }}>
          {['Item', 'Avg', 'Ratings', 'Top tag'].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONTS.body }}>{h}</span>
          ))}
        </div>

        {loading ? <Skeleton isDark={isDark} h={44} n={6} /> : items.length === 0 ? <Empty label="No item ratings yet" isDark={isDark} /> : (
          items.map((item, i) => (
            <div key={item._id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8,
              padding: '11px 16px', alignItems: 'center',
              borderBottom: i < items.length - 1 ? `1px solid ${dk(isDark, 'rgba(255,85,0,0.05)', 'rgba(100,50,10,0.06)')}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.menuItemId?.emoji ?? '🍽️'}</span>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.menuItemId?.name ?? 'Item'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: P.amber, fontFamily: FONTS.body }}>{item.avgRating?.toFixed(1) ?? '—'}</p>
                <Stars rating={item.avgRating ?? 0} size={9} />
              </div>
              <p style={{ margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{item.totalRatings}</p>
              <p style={{ margin: 0, fontSize: 10, color: P.blue, fontFamily: FONTS.body }}>
                {item.topTags?.[0]?.tag?.replace(/_/g, ' ') ?? '—'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN FeedbackPanel
═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'analytics', label: 'Analytics',   Icon: BarChart3     },
  { key: 'feedback',  label: 'All Feedback', Icon: MessageSquare },
  { key: 'items',     label: 'Per-Item',     Icon: Star          },
]

export default function FeedbackPanel() {
  const { isDark } = useContext(ThemeContext)
  const [tab, setTab] = useState('analytics')
  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    if (wrapRef.current) gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
  }, [tab])

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`@keyframes fb-pulse { 0%,100%{opacity:.45} 50%{opacity:.18} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
          Feedback & Ratings
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
          Module 21 — Post-order feedback, NPS, per-item ratings
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: dk(isDark, '#161210', '#f5f0ea'), borderRadius: 12, padding: 4, overflowX: 'auto' }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: tab === key ? dk(isDark, '#211913', '#fff') : 'transparent',
            color: tab === key ? P.orange : dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
            fontSize: 12, fontWeight: tab === key ? 700 : 500,
            fontFamily: FONTS.body,
            boxShadow: tab === key ? (isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.1)') : 'none',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            <Icon size={13} strokeWidth={tab === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      <div ref={wrapRef}>
        {tab === 'analytics' && <AnalyticsTab isDark={isDark} />}
        {tab === 'feedback'  && <AllFeedbackTab isDark={isDark} />}
        {tab === 'items'     && <ItemRatingsTab isDark={isDark} />}
      </div>
    </div>
  )
}