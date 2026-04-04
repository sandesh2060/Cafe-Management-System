// frontend/src/modules/owner/pages/BranchManager.jsx
//
// ─── REAL PAGE (replaces placeholder) ─────────────────────────────────────────
// Lets owner see all branches, switch between them, view basic branch stats.
// Same emerald green token system as OwnerDashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useContext, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Users, ShoppingBag, Settings, ChevronRight, MapPin, Phone, Globe, Clock } from 'lucide-react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { FONTS } from '@shared/config/brand'
import api from '@api/axios'

const mkG = (D) => ({
  accent:   '#10b981', accentDk: '#059669', accentLt: '#34d399',
  glow:     'rgba(16,185,129,0.25)',
  dim:      D ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
  bd:       D ? 'rgba(16,185,129,0.28)' : 'rgba(16,185,129,0.18)',
  red:      D ? '#f87171' : '#dc2626',
  textPri:  D ? 'rgba(248,250,252,0.95)' : 'rgba(15,23,42,0.9)',
  textSub:  D ? 'rgba(203,213,225,0.8)'  : 'rgba(51,65,85,0.75)',
  textMut:  D ? 'rgba(148,163,184,0.6)'  : 'rgba(100,116,139,0.6)',
  bg:       D ? '#080f0c' : '#f0fdf9',
  cardBg:   D ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.9)',
  cardBd:   D ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)',
  divider:  D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
  pillBg:   D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  pillBd:   D ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
  shadow:   D ? '0 8px 32px rgba(0,0,0,0.45)' : '0 4px 20px rgba(16,185,129,0.08)',
})

const Sk = ({ h = 16, w = '60%', r = 10, G }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: G.divider, animation: 'bm-pulse 1.5s ease-in-out infinite' }} />
)

export default function BranchManager() {
  const navigate = useNavigate()
  const { isDark: D } = useContext(ThemeContext)
  const G = mkG(D)

  const [cafes,    setCafes]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)

  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    gsap.fromTo(wrapRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }, [])

  useEffect(() => {
    api.get('/owner/cafes')
      .then(r => {
        const list = (r.data?.data ?? r.data)?.cafes ?? []
        setCafes(list)
        if (list.length > 0) setSelected(list[0]._id)
      })
      .catch(e => {
        if (e.response?.status === 401) navigate('/owner/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const active = cafes.find(c => c._id === selected)

  return (
    <div ref={wrapRef} style={{ minHeight: '100dvh', background: G.bg, fontFamily: FONTS.body, color: G.textPri, padding: 20, opacity: 0 }}>
      <style>{`@keyframes bm-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <div style={{ width: 3, height: 18, borderRadius: 4, background: `linear-gradient(180deg,#10b981,#059669)`, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: G.textPri, fontFamily: FONTS.heading, letterSpacing: '-0.02em' }}>Branch Manager</h1>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body, paddingLeft: 13 }}>
            {cafes.length} venue{cafes.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={() => navigate('/owner')} style={{
          padding: '7px 14px', borderRadius: 10, border: `1px solid ${G.pillBd}`,
          background: G.pillBg, color: G.textMut, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONTS.body,
        }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,260px) 1fr', gap: 16, alignItems: 'start' }}>

        {/* Cafe list sidebar */}
        <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 18, overflow: 'hidden', boxShadow: G.shadow }}>
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => <Sk key={i} G={G} h={52} w="100%" r={10} />)}
            </div>
          ) : cafes.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Store size={28} style={{ color: G.textMut, opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: G.textMut, margin: 0, fontFamily: FONTS.body }}>No cafes yet</p>
            </div>
          ) : cafes.map((c, i) => (
            <button key={c._id} onClick={() => setSelected(c._id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: selected === c._id ? G.dim : 'transparent',
              borderLeft: `3px solid ${selected === c._id ? G.accent : 'transparent'}`,
              borderTop: i > 0 ? `1px solid ${G.divider}` : 'none',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (selected !== c._id) e.currentTarget.style.background = G.pillBg }}
              onMouseLeave={e => { if (selected !== c._id) e.currentTarget.style.background = 'transparent' }}
            >
              {c.logo
                ? <img src={c.logo} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 34, height: 34, borderRadius: 8, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: G.accent, fontFamily: FONTS.heading, flexShrink: 0 }}>
                    {c.name?.[0]?.toUpperCase() ?? 'C'}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: selected === c._id ? G.textPri : G.textSub, fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.isActive ? G.accent : G.textMut, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, color: G.textMut, fontFamily: FONTS.body }}>{c.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
              {selected === c._id && <ChevronRight size={14} style={{ color: G.accent, flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Cafe detail */}
        {active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header */}
            <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 18, padding: 20, boxShadow: G.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                {active.logo
                  ? <img src={active.logo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 14, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: G.accent, fontFamily: FONTS.heading }}>
                      {active.name?.[0]?.toUpperCase()}
                    </div>
                }
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: G.textPri, fontFamily: FONTS.heading }}>{active.name}</h2>
                  <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>/{active.slug}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONTS.body, background: active.isActive ? G.dim : G.pillBg, border: `1px solid ${active.isActive ? G.bd : G.pillBd}`, color: active.isActive ? G.accent : G.textMut }}>
                    {active.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                {[
                  { icon: MapPin,  value: active.address || 'No address set' },
                  { icon: Phone,   value: active.phone   || 'No phone set'   },
                  { icon: Globe,   value: active.website || 'No website set' },
                ].map(({ icon: Icon, value }) => (
                  <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: G.pillBg, border: `1px solid ${G.pillBd}` }}>
                    <Icon size={13} style={{ color: G.textMut, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 11, color: G.textSub, fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
              {[
                { label: 'Orders / month', value: active.ordersThisMonth ?? 0, icon: ShoppingBag },
                { label: 'Staff',          value: active.tenant?.staffCount ?? '—', icon: Users },
                { label: 'Plan',           value: active.tenant?.plan ?? '—', icon: Settings },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 16, padding: '16px 18px', boxShadow: G.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>{label}</p>
                    <Icon size={13} style={{ color: G.accent }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: G.textPri, fontFamily: FONTS.heading }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Tenant info */}
            {active.tenant && (
              <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 18, padding: 20, boxShadow: G.shadow }}>
                <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>Tenant Info</p>
                {[
                  { label: 'Tenant status',   value: active.tenant.status },
                  { label: 'Current plan',    value: active.tenant.plan },
                  { label: 'Order cap',       value: active.tenant.orderCap ?? 'Unlimited' },
                  { label: 'Orders used',     value: `${active.ordersThisMonth ?? 0} / ${active.tenant.orderCap ?? '∞'}` },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${G.divider}` }}>
                    <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>{f.label}</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: G.textPri, fontFamily: FONTS.body }}>{f.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, background: G.cardBg, borderRadius: 18, border: `1px solid ${G.cardBd}` }}>
            <p style={{ fontSize: 13, color: G.textMut, fontFamily: FONTS.body }}>Select a cafe to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}