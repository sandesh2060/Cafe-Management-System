// frontend/src/modules/manager/components/pricing/PricingRulePanel.jsx
//
// Module 22 — Manager Pricing Rule Panel
// Tabs: Active Rules | Create Rule | Analytics
//
// Fits into ManagerDashboard PANELS map under key 'pricing'.
// Design matches ManagerDashboard P palette + FONTS.

import {
  useState, useEffect, useCallback,
  useRef, useContext, useLayoutEffect,
} from 'react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { FONTS, BRAND } from '@shared/config/brand'
import { COLORS } from '@colors'
import api from '@api/axios'
import {
  Zap, Plus, X, Save, Pause, Play, Trash2,
  Clock, Tag, RefreshCw, ChevronDown, BarChart3,
} from 'lucide-react'

// ── Local tokens (matches ManagerDashboard P palette) ────────────────────────
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

const inputSt = (isDark) => ({
  background:   dk(isDark, COLORS.dark.surface2, COLORS.cream.DEFAULT),
  border:       `1.5px solid ${dk(isDark, COLORS.dark.border, COLORS.cream.border)}`,
  color:        dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT),
  borderRadius: 10, padding: '9px 12px', fontSize: 13,
  fontFamily: FONTS.body, outline: 'none', width: '100%', boxSizing: 'border-box',
})

const btnPrimary = {
  background:  `linear-gradient(135deg, ${COLORS.saffron.DEFAULT}, ${COLORS.terra.DEFAULT})`,
  color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px',
  fontSize: 12, fontWeight: 700, fontFamily: FONTS.body, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
}

const btnGhost = (isDark) => ({
  background:  dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.05)'),
  color:       dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
  border:      `1px solid ${dk(isDark, COLORS.dark.border, COLORS.cream.border)}`,
  borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600,
  fontFamily: FONTS.body, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
})

const Label = ({ children, isDark }) => (
  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
    marginBottom: 5, fontFamily: FONTS.body }}>
    {children}
  </label>
)

const Input = ({ label, isDark, style = {}, ...p }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <Label isDark={isDark}>{label}</Label>}
    <input style={{ ...inputSt(isDark), ...style }} {...p} />
  </div>
)

const Select = ({ label, isDark, children, ...p }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <Label isDark={isDark}>{label}</Label>}
    <select style={{ ...inputSt(isDark), cursor: 'pointer' }} {...p}>{children}</select>
  </div>
)

const Empty = ({ label, isDark }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
    <Zap size={28} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), margin: '0 auto 10px', opacity: 0.3 }} />
    <p style={{ margin: 0, fontSize: 13, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{label}</p>
  </div>
)

const Skeleton = ({ isDark, h = 48, n = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ height: h, borderRadius: 10,
        background: dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'),
        animation: 'pr-pulse 1.4s ease-in-out infinite' }} />
    ))}
  </div>
)

// ── Rule type config ──────────────────────────────────────────────────────────
const RULE_TYPES = [
  { value: 'happy_hour',   label: '🎉 Happy Hour'     },
  { value: 'day_of_week',  label: '📅 Day of Week'    },
  { value: 'date_range',   label: '🗓️ Date Range'     },
  { value: 'combo',        label: '🍱 Combo Deal'     },
  { value: 'surcharge',    label: '⚡ Peak Surcharge'  },
  { value: 'loyalty_tier', label: '⭐ Loyalty Tier'   },
  { value: 'min_order',    label: '🛒 Min Order'      },
  { value: 'quantity',     label: '📦 Quantity Rule'  },
]

const DISCOUNT_TYPES = [
  { value: 'percentage',   label: '% Percentage off'  },
  { value: 'fixed_amount', label: 'Rs Fixed amount off'},
  { value: 'fixed_price',  label: 'Rs Fixed price'    },
  { value: 'free',         label: '🆓 Free'            },
]

const SCOPES = [
  { value: 'all',      label: 'All items'        },
  { value: 'category', label: 'Category'         },
  { value: 'item',     label: 'Specific items'   },
]

const STATUS_COLOR = {
  active:    P.green,
  paused:    P.amber,
  scheduled: P.blue,
  expired:   P.rose,
}

const EMPTY_FORM = {
  name: '', type: 'happy_hour', scope: 'all',
  discountType: 'percentage', discountValue: '',
  timeWindow: { startTime: '', endTime: '' },
  daysOfWeek: [], dateRange: { startDate: '', endDate: '' },
  targetCategories: '', minOrderValue: '', minQuantity: '',
  loyaltyTiers: '', priority: 0, stackable: false,
  maxDiscountCap: '', status: 'active',
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1: Active Rules
═══════════════════════════════════════════════════════════════════════ */
function RulesTab({ isDark, onEdit }) {
  const [rules,    setRules]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/pricing-rules')
      .then(r => setRules(r.rules ?? r.data?.rules ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    await api.patch(`/pricing-rules/${id}/status`, { status }).catch(() => {})
    load()
  }

  const deleteRule = async (id) => {
    if (!confirm('Delete this pricing rule?')) return
    await api.delete(`/pricing-rules/${id}`).catch(() => {})
    load()
  }

  const fmtCountdown = (secs) => {
    if (!secs) return null
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
        <button onClick={load} style={btnGhost(isDark)}><RefreshCw size={12} /></button>
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {loading ? <Skeleton isDark={isDark} h={60} n={4} /> :
         rules.length === 0 ? <Empty label="No pricing rules yet — create one!" isDark={isDark} /> : (
          rules.map((rule, i) => {
            const sc = STATUS_COLOR[rule.status] ?? P.blue
            const isLive = rule.isActiveNow
            return (
              <div key={rule._id} style={{ borderBottom: i < rules.length - 1 ? `1px solid ${dk(isDark, 'rgba(255,85,0,0.05)', 'rgba(0,0,0,0.05)')}` : 'none' }}>
                <div onClick={() => setExpanded(expanded === rule._id ? null : rule._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.025)')}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Live indicator */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? P.green : sc,
                    boxShadow: isLive ? `0 0 8px ${P.green}` : 'none', flexShrink: 0,
                    animation: isLive ? 'pr-live 1.5s ease-in-out infinite' : 'none' }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700,
                        color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
                        {rule.name}
                      </p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: `${sc}14`, color: sc, border: `1px solid ${sc}25`, fontFamily: FONTS.body }}>
                        {rule.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                      {RULE_TYPES.find(t => t.value === rule.type)?.label ?? rule.type} ·
                      {rule.discountValue}{rule.discountType === 'percentage' ? '%' : ` ${BRAND.currency}`} off ·
                      priority {rule.priority}
                    </p>
                    {rule.secondsRemaining && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: P.amber, fontFamily: FONTS.body }}>
                        ⏱ {fmtCountdown(rule.secondsRemaining)}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                      {rule.usageCount ?? 0} uses
                    </p>
                  </div>
                  <ChevronDown size={13} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
                    transform: expanded === rule._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>

                {expanded === rule._id && (
                  <div style={{ padding: '0 16px 14px 36px' }}>
                    {rule.timeWindow?.startTime && (
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                        <Clock size={10} style={{ marginRight: 4 }} />
                        {rule.timeWindow.startTime} – {rule.timeWindow.endTime}
                      </p>
                    )}
                    {rule.daysOfWeek?.length > 0 && (
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                        Days: {rule.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
                      </p>
                    )}
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                      Scope: {rule.scope} · Stackable: {rule.stackable ? 'Yes' : 'No'}
                      {rule.maxDiscountCap ? ` · Max cap: ${BRAND.currency} ${rule.maxDiscountCap}` : ''}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 11, color: P.amber, fontFamily: FONTS.body }}>
                      Total discount given: {BRAND.currency} {rule.totalDiscountGiven?.toLocaleString() ?? 0}
                    </p>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      <button onClick={() => onEdit(rule)} style={{ ...btnGhost(isDark), fontSize: 11 }}>
                        Edit
                      </button>
                      {rule.status === 'active'
                        ? <button onClick={() => updateStatus(rule._id, 'paused')}
                            style={{ ...btnGhost(isDark), fontSize: 11, color: P.amber, borderColor: `${P.amber}30` }}>
                            <Pause size={11} /> Pause
                          </button>
                        : <button onClick={() => updateStatus(rule._id, 'active')}
                            style={{ ...btnGhost(isDark), fontSize: 11, color: P.green, borderColor: `${P.green}30` }}>
                            <Play size={11} /> Activate
                          </button>
                      }
                      <button onClick={() => deleteRule(rule._id)}
                        style={{ ...btnGhost(isDark), fontSize: 11, color: P.rose, borderColor: `${P.rose}30` }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2: Create / Edit Rule
═══════════════════════════════════════════════════════════════════════ */
function CreateRuleTab({ isDark, editTarget, onSaved }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (editTarget) {
      setForm({
        name:             editTarget.name ?? '',
        type:             editTarget.type ?? 'happy_hour',
        scope:            editTarget.scope ?? 'all',
        discountType:     editTarget.discountType ?? 'percentage',
        discountValue:    editTarget.discountValue ?? '',
        timeWindow:       editTarget.timeWindow ?? { startTime: '', endTime: '' },
        daysOfWeek:       editTarget.daysOfWeek ?? [],
        dateRange:        editTarget.dateRange ?? { startDate: '', endDate: '' },
        targetCategories: editTarget.targetCategories?.join(', ') ?? '',
        minOrderValue:    editTarget.minOrderValue ?? '',
        minQuantity:      editTarget.minQuantity ?? '',
        loyaltyTiers:     editTarget.loyaltyTiers?.join(', ') ?? '',
        priority:         editTarget.priority ?? 0,
        stackable:        editTarget.stackable ?? false,
        maxDiscountCap:   editTarget.maxDiscountCap ?? '',
        status:           editTarget.status ?? 'active',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError('')
  }, [editTarget?._id])

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const fw = (key) => (e) => setForm(p => ({ ...p, timeWindow: { ...p.timeWindow, [key]: e.target.value } }))
  const fd = (key) => (e) => setForm(p => ({ ...p, dateRange: { ...p.dateRange, [key]: e.target.value } }))

  const toggleDay = (d) => setForm(p => ({
    ...p,
    daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d],
  }))

  const save = async () => {
    if (!form.name.trim())     { setError('Name is required'); return }
    if (!form.discountValue)   { setError('Discount value is required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        discountValue:    Number(form.discountValue),
        maxDiscountCap:   form.maxDiscountCap ? Number(form.maxDiscountCap) : null,
        minOrderValue:    form.minOrderValue  ? Number(form.minOrderValue)  : null,
        minQuantity:      form.minQuantity    ? Number(form.minQuantity)    : null,
        targetCategories: form.targetCategories ? form.targetCategories.split(',').map(s => s.trim()).filter(Boolean) : [],
        loyaltyTiers:     form.loyaltyTiers     ? form.loyaltyTiers.split(',').map(s => s.trim()).filter(Boolean)     : [],
      }
      if (editTarget?._id) {
        await api.patch(`/pricing-rules/${editTarget._id}`, payload)
      } else {
        await api.post('/pricing-rules', payload)
      }
      setForm(EMPTY_FORM)
      onSaved()
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const showTimeWindow  = ['happy_hour','surcharge'].includes(form.type)
  const showDaysOfWeek  = ['day_of_week'].includes(form.type)
  const showDateRange   = ['date_range'].includes(form.type)
  const showMinOrder    = ['min_order'].includes(form.type)
  const showQuantity    = ['quantity'].includes(form.type)
  const showLoyalty     = ['loyalty_tier'].includes(form.type)

  return (
    <div style={{ ...cardSt(isDark), padding: 20 }}>
      <p style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 800,
        color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
        {editTarget ? `Editing: ${editTarget.name}` : 'New Pricing Rule'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Rule name" isDark={isDark} placeholder='e.g. "Evening Happy Hour"'
            value={form.name} onChange={f('name')} />
        </div>
        <Select label="Rule type" isDark={isDark} value={form.type} onChange={f('type')}>
          {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select label="Scope" isDark={isDark} value={form.scope} onChange={f('scope')}>
          {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select label="Discount type" isDark={isDark} value={form.discountType} onChange={f('discountType')}>
          {DISCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input label="Discount value" isDark={isDark} type="number" placeholder="e.g. 20"
          value={form.discountValue} onChange={f('discountValue')} />
      </div>

      {/* Scope: category */}
      {form.scope === 'category' && (
        <Input label="Target categories (comma-separated)" isDark={isDark}
          placeholder="drinks, snacks" value={form.targetCategories} onChange={f('targetCategories')} />
      )}

      {/* Time window */}
      {showTimeWindow && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start time (HH:MM)" isDark={isDark} placeholder="15:00"
            value={form.timeWindow.startTime} onChange={fw('startTime')} />
          <Input label="End time (HH:MM)" isDark={isDark} placeholder="17:00"
            value={form.timeWindow.endTime} onChange={fw('endTime')} />
        </div>
      )}

      {/* Days of week */}
      {showDaysOfWeek && (
        <div style={{ marginBottom: 14 }}>
          <Label isDark={isDark}>Days of week</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <button key={d} type="button" onClick={() => toggleDay(i)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: form.daysOfWeek.includes(i) ? P.orange : dk(isDark, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.07)'),
                  color: form.daysOfWeek.includes(i) ? '#fff' : dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
                  fontSize: 11, fontWeight: 700, fontFamily: FONTS.body, transition: 'all 0.15s',
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date range */}
      {showDateRange && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start date" isDark={isDark} type="date"
            value={form.dateRange.startDate?.slice(0,10) ?? ''} onChange={fd('startDate')} />
          <Input label="End date" isDark={isDark} type="date"
            value={form.dateRange.endDate?.slice(0,10) ?? ''} onChange={fd('endDate')} />
        </div>
      )}

      {/* Min order */}
      {showMinOrder && (
        <Input label={`Minimum order value (${BRAND.currency})`} isDark={isDark} type="number"
          placeholder="1000" value={form.minOrderValue} onChange={f('minOrderValue')} />
      )}

      {/* Quantity */}
      {showQuantity && (
        <Input label="Minimum quantity" isDark={isDark} type="number"
          placeholder="3" value={form.minQuantity} onChange={f('minQuantity')} />
      )}

      {/* Loyalty tiers */}
      {showLoyalty && (
        <Input label="Loyalty tiers (silver, gold, platinum)" isDark={isDark}
          placeholder="gold, platinum" value={form.loyaltyTiers} onChange={f('loyaltyTiers')} />
      )}

      {/* Advanced */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Input label="Priority (higher = first)" isDark={isDark} type="number"
          value={form.priority} onChange={f('priority')} />
        <Input label={`Max discount cap (${BRAND.currency})`} isDark={isDark} type="number"
          placeholder="optional" value={form.maxDiscountCap} onChange={f('maxDiscountCap')} />
        <Select label="Status" isDark={isDark} value={form.status} onChange={f('status')}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="scheduled">Scheduled</option>
        </Select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <input type="checkbox" id="stackable" checked={form.stackable} onChange={f('stackable')} />
        <label htmlFor="stackable" style={{ fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, cursor: 'pointer' }}>
          Stackable — can combine with other rules
        </label>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: `${P.rose}10`,
          border: `1px solid ${P.rose}25`, color: P.rose, fontSize: 12,
          fontFamily: FONTS.body, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          <Save size={13} /> {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Rule'}
        </button>
        {editTarget && (
          <button onClick={() => { setForm(EMPTY_FORM); onSaved() }} style={btnGhost(isDark)}>
            <X size={12} /> Cancel
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3: Analytics
═══════════════════════════════════════════════════════════════════════ */
function AnalyticsTab({ isDark }) {
  const [rules,   setRules]   = useState([])
  const [selId,   setSelId]   = useState(null)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/pricing-rules').then(r => setRules(r.rules ?? r.data?.rules ?? [])).catch(() => {})
  }, [])

  const load = useCallback((id) => {
    if (!id) return
    setSelId(id); setLoading(true)
    api.get(`/pricing-rules/${id}/analytics?days=30`)
      .then(r => setData(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Select label="Select rule" isDark={isDark} value={selId ?? ''} onChange={e => load(e.target.value)}>
          <option value="">Choose a rule…</option>
          {rules.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
        </Select>
      </div>

      {loading ? <Skeleton isDark={isDark} h={60} n={3} /> :
       !data ? <Empty label="Select a rule to view analytics" isDark={isDark} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Total discount given', value: `${BRAND.currency} ${data.totals?.totalDiscountGiven?.toLocaleString() ?? 0}`, color: P.rose },
              { label: 'Unique orders',        value: data.totals?.uniqueOrders ?? 0, color: P.green },
              { label: 'Usage count',          value: data.totals?.usageCount   ?? 0, color: P.blue  },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...cardSt(isDark), padding: 14, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color, fontFamily: FONTS.body, letterSpacing: '-0.5px' }}>{value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONTS.body }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Daily trend */}
          {data.dailyTrend?.length > 0 && (
            <div style={{ ...cardSt(isDark), padding: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700,
                color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
                textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>
                Daily discount given (last 30 days)
              </p>
              {data.dailyTrend.slice(-14).map(d => (
                <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
                    fontFamily: FONTS.body, width: 60, flexShrink: 0 }}>{d._id?.slice(5)}</p>
                  <div style={{ flex: 1, height: 5, borderRadius: 99, background: dk(isDark, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.07)'), overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (d.discount / (Math.max(...data.dailyTrend.map(x => x.discount)) || 1)) * 100)}%`,
                      background: P.amber, borderRadius: 99 }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.amber, fontFamily: FONTS.body, width: 60, textAlign: 'right', flexShrink: 0 }}>
                    {BRAND.currency} {d.discount?.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PricingRulePanel
═══════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'rules',     label: 'Rules',     Icon: Zap       },
  { key: 'create',    label: 'Create',    Icon: Plus      },
  { key: 'analytics', label: 'Analytics', Icon: BarChart3  },
]

export default function PricingRulePanel() {
  const { isDark } = useContext(ThemeContext)
  const [tab,        setTab]        = useState('rules')
  const [editTarget, setEditTarget] = useState(null)
  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    if (wrapRef.current) gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
  }, [tab])

  const handleEdit = useCallback((rule) => {
    setEditTarget(rule)
    setTab('create')
  }, [])

  const handleSaved = useCallback(() => {
    setEditTarget(null)
    setTab('rules')
  }, [])

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`
        @keyframes pr-pulse { 0%,100%{opacity:.45} 50%{opacity:.18} }
        @keyframes pr-live   { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800,
          color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
          Dynamic Pricing
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 11,
          color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
          Module 22 — Happy Hour, combos, loyalty discounts & more
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18,
        background: dk(isDark, '#161210', '#f5f0ea'), borderRadius: 12, padding: 4 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setTab(key); if (key !== 'create') setEditTarget(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: tab === key ? dk(isDark, '#211913', '#fff') : 'transparent',
              color: tab === key ? P.orange : dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
              fontSize: 12, fontWeight: tab === key ? 700 : 500, fontFamily: FONTS.body,
              boxShadow: tab === key ? (isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.1)') : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
            <Icon size={13} strokeWidth={tab === key ? 2.5 : 2} />{label}
            {key === 'create' && editTarget && (
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 6,
                background: P.amber, color: '#fff', fontWeight: 800 }}>EDIT</span>
            )}
          </button>
        ))}
      </div>

      <div ref={wrapRef}>
        {tab === 'rules'     && <RulesTab     isDark={isDark} onEdit={handleEdit} />}
        {tab === 'create'    && <CreateRuleTab isDark={isDark} editTarget={editTarget} onSaved={handleSaved} />}
        {tab === 'analytics' && <AnalyticsTab  isDark={isDark} />}
      </div>
    </div>
  )
}