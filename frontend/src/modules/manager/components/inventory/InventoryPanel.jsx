// src/modules/manager/components/inventory/InventoryPanel.jsx
//
// ─── MODULE 20 — Complete Inventory Manager UI ────────────────────────────────
// Replaces the old simple panel (quantity/lowThreshold) with the full
// Module 20 API surface:
//   Tab 1 — Ingredients   GET/POST/PATCH /inventory/ingredients
//   Tab 2 — Recipes       GET/POST/PATCH /inventory/recipes
//   Tab 3 — Movements     GET /inventory/movements + POST waste/manual
//   Tab 4 — Orders        GET/POST/PATCH /inventory/purchase-orders
//
// Design: matches ManagerDashboard's P palette + FONTS + COLORS system.
// GSAP entrance animations. No external component library.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useLayoutEffect, useRef, useCallback,
  useContext, useMemo,
} from 'react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { FONTS } from '@shared/config/brand'
import { COLORS } from '@colors'
import api from '@api/axios'
import {
  Package, Plus, X, AlertTriangle, CheckCircle2,
  TrendingDown, ShoppingCart, ChevronRight, RefreshCw,
  Search, Filter, ArrowDown, ArrowUp, Beaker, ClipboardList,
  Truck, BarChart3, Edit3, Trash2, Save, Eye, ChevronDown,
} from 'lucide-react'

// ─── Local design tokens (matches ManagerDashboard P palette) ────────────────
const P = {
  orange: '#FF5500', orangeHi: '#FF7733', rose: '#F43F5E',
  green: '#22C55E', blue: '#6366F1', amber: '#F59E0B',
  teal: '#14B8A6',
}

const dk = (d, dark, light) => d ? dark : light

const cardSt = (isDark) => ({
  background:   dk(isDark, '#161210', '#FFFFFF'),
  border:       `1px solid ${dk(isDark, 'rgba(255,85,0,0.09)', 'rgba(100,50,10,0.15)')}`,
  borderRadius: 16,
  boxShadow:    isDark
    ? '0 1px 4px rgba(0,0,0,0.45)'
    : '0 2px 12px rgba(60,20,0,0.08)',
})

const inputSt = (isDark) => ({
  background:  dk(isDark, COLORS.dark.surface2, COLORS.cream.DEFAULT),
  border:      `1.5px solid ${dk(isDark, COLORS.dark.border, COLORS.cream.border)}`,
  color:       dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT),
  borderRadius: 10,
  padding:     '9px 12px',
  fontSize:    13,
  fontFamily:  FONTS.body,
  outline:     'none',
  width:       '100%',
  boxSizing:   'border-box',
  transition:  'border-color 0.15s',
})

const btnPrimary = {
  background:  `linear-gradient(135deg, ${COLORS.saffron.DEFAULT}, ${COLORS.terra.DEFAULT})`,
  color:       '#fff',
  border:      'none',
  borderRadius: 10,
  padding:     '9px 18px',
  fontSize:    12,
  fontWeight:  700,
  fontFamily:  FONTS.body,
  cursor:      'pointer',
  display:     'flex',
  alignItems:  'center',
  gap:         6,
}

const btnGhost = (isDark) => ({
  background:  dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.05)'),
  color:       dk(isDark, COLORS.dark.muted, COLORS.brew.soft),
  border:      `1px solid ${dk(isDark, COLORS.dark.border, COLORS.cream.border)}`,
  borderRadius: 10,
  padding:     '8px 14px',
  fontSize:    12,
  fontWeight:  600,
  fontFamily:  FONTS.body,
  cursor:      'pointer',
  display:     'flex',
  alignItems:  'center',
  gap:         5,
})

// ─── Shared sub-components ────────────────────────────────────────────────────

const Label = ({ children, isDark }) => (
  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONTS.body }}>
    {children}
  </label>
)

const Input = ({ label, isDark, style = {}, ...p }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <Label isDark={isDark}>{label}</Label>}
    <input style={{ ...inputSt(isDark), ...style }} {...p} />
  </div>
)

const Select = ({ label, isDark, children, style = {}, ...p }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <Label isDark={isDark}>{label}</Label>}
    <select style={{ ...inputSt(isDark), ...style, cursor: 'pointer' }} {...p}>
      {children}
    </select>
  </div>
)

const Pill = ({ label, color }) => (
  <span style={{
    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
    background: `${color}18`, color, border: `1px solid ${color}28`,
    fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
)

const Skeleton = ({ isDark, h = 48, n = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ height: h, borderRadius: 10, background: dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'), animation: 'inv-pulse 1.4s ease-in-out infinite' }} />
    ))}
  </div>
)

const Empty = ({ icon: Icon, label, isDark }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
    <Icon size={28} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), margin: '0 auto 10px', opacity: 0.4 }} />
    <p style={{ margin: 0, fontSize: 13, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{label}</p>
  </div>
)

const Modal = ({ open, onClose, title, isDark, children }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
      <div style={{ ...cardSt(isDark), position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: 24 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Tab 1: Ingredients ───────────────────────────────────────────────────────

const UNITS = ['kg','g','litre','ml','piece','packet','dozen']
const CATS  = ['dairy','beverage','dry','produce','meat','condiment','other']
const EMPTY_ING = { name: '', unit: 'kg', category: 'other', currentStock: 0, reorderLevel: 0, criticalLevel: 0, costPerUnit: 0, supplier: '' }

function IngredientsTab({ isDark }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [catFilter,setCatFilter]= useState('')
  const [showModal,setShowModal]= useState(false)
  const [editing,  setEditing]  = useState(null) // null = create
  const [form,     setForm]     = useState(EMPTY_ING)
  const [saving,   setSaving]   = useState(false)
  const [showLow,  setShowLow]  = useState(false)
  const listRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search)    params.search   = search
    if (catFilter) params.category = catFilter
    api.get('/inventory/ingredients', { params })
      .then(r => setItems(r.ingredients ?? r.data?.ingredients ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, catFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!listRef.current || loading) return
    const rows = listRef.current.querySelectorAll('.inv-row')
    gsap.fromTo(rows, { opacity: 0, x: -12 }, { opacity: 1, x: 0, stagger: 0.03, duration: 0.28, ease: 'power2.out' })
  }, [loading, items.length])

  const openCreate = () => { setEditing(null); setForm(EMPTY_ING); setShowModal(true) }
  const openEdit   = (item) => { setEditing(item._id); setForm({ name: item.name, unit: item.unit, category: item.category, currentStock: item.currentStock, reorderLevel: item.reorderLevel, criticalLevel: item.criticalLevel, costPerUnit: item.costPerUnit, supplier: item.supplier ?? '' }); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/inventory/ingredients/${editing}`, form)
      } else {
        await api.post('/inventory/ingredients', form)
      }
      setShowModal(false); load()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Deactivate this ingredient?')) return
    await api.delete(`/inventory/ingredients/${id}`)
    load()
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  const shown = showLow ? items.filter(i => i.currentStock <= i.reorderLevel) : items
  const lowCount = items.filter(i => i.currentStock <= i.reorderLevel && i.currentStock > 0).length
  const outCount = items.filter(i => i.currentStock <= 0).length

  const stockColor = (item) =>
    item.currentStock <= 0               ? P.rose  :
    item.currentStock <= item.criticalLevel ? P.rose  :
    item.currentStock <= item.reorderLevel  ? P.amber :
    P.green

  return (
    <div>
      {/* Alerts */}
      {(outCount > 0 || lowCount > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: `${P.rose}10`, border: `1px solid ${P.rose}25`, marginBottom: 14 }}>
          <AlertTriangle size={14} style={{ color: P.rose, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, fontFamily: FONTS.body, color: P.rose, fontWeight: 600 }}>
            {outCount > 0 && `${outCount} out of stock`}{outCount > 0 && lowCount > 0 && ' · '}{lowCount > 0 && `${lowCount} running low`}
          </p>
          <button onClick={() => setShowLow(v => !v)} style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: P.rose, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body }}>
            {showLow ? 'Show all' : 'Show low only'}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients…"
            style={{ ...inputSt(isDark), paddingLeft: 30, marginBottom: 0 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ ...inputSt(isDark), width: 130, marginBottom: 0, cursor: 'pointer' }}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} style={btnGhost(isDark)}><RefreshCw size={12} /></button>
        <button onClick={openCreate} style={btnPrimary}><Plus size={13} /> Add</button>
      </div>

      {/* List */}
      <div ref={listRef} style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1fr auto', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)')}` }}>
          {['Name', 'Unit', 'Stock', 'Reorder at', 'Cost/unit', ''].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONTS.body }}>{h}</span>
          ))}
        </div>

        {loading ? <Skeleton isDark={isDark} /> : shown.length === 0 ? <Empty icon={Package} label="No ingredients found" isDark={isDark} /> : (
          shown.map(item => {
            const c = stockColor(item)
            return (
              <div key={item._id} className="inv-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1fr auto', gap: 8, padding: '12px 16px', alignItems: 'center', borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}`, transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.025)')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    {item.category && <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, textTransform: 'capitalize' }}>{item.category}</p>}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{item.unit}</p>

                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: c, fontFamily: FONTS.body }}>{item.currentStock}</p>
                  {item.currentStock <= 0 && <Pill label="OUT" color={P.rose} />}
                  {item.currentStock > 0 && item.currentStock <= item.reorderLevel && <Pill label="LOW" color={P.amber} />}
                </div>

                <p style={{ margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>{item.reorderLevel} {item.unit}</p>

                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
                  Rs {item.costPerUnit ?? 0}
                </p>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), padding: 4 }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => del(item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.rose, padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Ingredient' : 'Add Ingredient'} isDark={isDark}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Name" isDark={isDark} placeholder="e.g. Coffee Beans" value={form.name} onChange={f('name')} />
          </div>
          <Select label="Unit" isDark={isDark} value={form.unit} onChange={f('unit')}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </Select>
          <Select label="Category" isDark={isDark} value={form.category} onChange={f('category')}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Current Stock" isDark={isDark} type="number" value={form.currentStock} onChange={f('currentStock')} />
          <Input label="Reorder Level" isDark={isDark} type="number" value={form.reorderLevel} onChange={f('reorderLevel')} />
          <Input label="Critical Level" isDark={isDark} type="number" value={form.criticalLevel} onChange={f('criticalLevel')} />
          <Input label="Cost per Unit (Rs)" isDark={isDark} type="number" value={form.costPerUnit} onChange={f('costPerUnit')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Supplier (optional)" isDark={isDark} placeholder="Supplier name" value={form.supplier} onChange={f('supplier')} />
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 8, opacity: saving ? 0.6 : 1 }}>
          <Save size={13} /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Ingredient'}
        </button>
      </Modal>
    </div>
  )
}

// ─── Tab 2: Recipes ───────────────────────────────────────────────────────────

const EMPTY_REC_ING = { ingredientId: '', quantity: '', unit: '' }

function RecipesTab({ isDark }) {
  const [recipes,  setRecipes]  = useState([])
  const [ings,     setIngs]     = useState([])
  const [menus,    setMenus]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showModal,setShowModal]= useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ menuItemId: '', ingredients: [{ ...EMPTY_REC_ING }], yield: 1, prepNotes: '' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/inventory/recipes'),
      api.get('/inventory/ingredients?includeInactive=false'),
      api.get('/menu'),
    ]).then(([r, i, m]) => {
      setRecipes(r.recipes ?? r.data?.recipes ?? [])
      setIngs(i.ingredients ?? i.data?.ingredients ?? [])
      setMenus(m.items ?? m.data?.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const addIng    = () => setForm(p => ({ ...p, ingredients: [...p.ingredients, { ...EMPTY_REC_ING }] }))
  const removeIng = (i) => setForm(p => ({ ...p, ingredients: p.ingredients.filter((_, idx) => idx !== i) }))
  const setIng    = (i, k, v) => setForm(p => ({ ...p, ingredients: p.ingredients.map((ing, idx) => idx === i ? { ...ing, [k]: v } : ing) }))

  const save = async () => {
    if (!form.menuItemId) return
    const valid = form.ingredients.filter(i => i.ingredientId && i.quantity > 0 && i.unit)
    if (!valid.length) return
    setSaving(true)
    try {
      await api.post('/inventory/recipes', { ...form, ingredients: valid })
      setShowModal(false); setForm({ menuItemId: '', ingredients: [{ ...EMPTY_REC_ING }], yield: 1, prepNotes: '' }); load()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setShowModal(true)} style={btnPrimary}><Plus size={13} /> New Recipe</button>
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {loading ? <Skeleton isDark={isDark} n={3} h={60} /> : recipes.length === 0 ? <Empty icon={Beaker} label="No recipes mapped yet" isDark={isDark} /> : (
          recipes.map((rec, i) => (
            <div key={rec._id} style={{ borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}` }}>
              <div onClick={() => setExpanded(expanded === rec._id ? null : rec._id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.025)')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${P.blue}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Beaker size={15} style={{ color: P.blue }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
                    {rec.menuItemId?.name ?? 'Unknown item'}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                    {rec.ingredients?.length ?? 0} ingredients · yield {rec.yield ?? 1}
                  </p>
                </div>
                <ChevronDown size={14} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), transform: expanded === rec._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {expanded === rec._id && (
                <div style={{ padding: '0 16px 14px 62px' }}>
                  {rec.ingredients?.map((ing, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: j > 0 ? `1px solid ${dk(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}` : 'none' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.blue, opacity: 0.6, flexShrink: 0 }} />
                      <p style={{ flex: 1, margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
                        {ing.ingredientId?.name ?? ing.ingredientId}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: P.blue, fontFamily: FONTS.body }}>
                        {ing.quantity} {ing.unit}
                      </p>
                      {ing.ingredientId?.currentStock !== undefined && (
                        <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                          ({ing.ingredientId.currentStock} in stock)
                        </p>
                      )}
                    </div>
                  ))}
                  {rec.prepNotes && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, fontStyle: 'italic' }}>
                      Note: {rec.prepNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Map Recipe" isDark={isDark}>
        <Select label="Menu Item" isDark={isDark} value={form.menuItemId} onChange={e => setForm(p => ({ ...p, menuItemId: e.target.value }))}>
          <option value="">Select menu item…</option>
          {menus.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
        </Select>

        <Label isDark={isDark}>Ingredients (per 1 serving)</Label>
        {form.ingredients.map((ing, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 30px', gap: 6, marginBottom: 8, alignItems: 'end' }}>
            <select value={ing.ingredientId} onChange={e => setIng(i, 'ingredientId', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0, cursor: 'pointer' }}>
              <option value="">Pick ingredient…</option>
              {ings.map(g => <option key={g._id} value={g._id}>{g.name} ({g.unit})</option>)}
            </select>
            <input type="number" placeholder="Qty" value={ing.quantity} onChange={e => setIng(i, 'quantity', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0 }} />
            <input placeholder="Unit" value={ing.unit} onChange={e => setIng(i, 'unit', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0 }} />
            <button onClick={() => removeIng(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.rose, paddingBottom: 2 }}>
              <X size={13} />
            </button>
          </div>
        ))}
        <button onClick={addIng} style={{ ...btnGhost(isDark), marginBottom: 14, fontSize: 11 }}>
          <Plus size={11} /> Add ingredient
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="Yield (servings)" isDark={isDark} type="number" value={form.yield} onChange={e => setForm(p => ({ ...p, yield: Number(e.target.value) }))} />
          <div /> {/* spacer */}
        </div>
        <Input label="Prep Notes (optional)" isDark={isDark} placeholder="Any instructions…" value={form.prepNotes} onChange={e => setForm(p => ({ ...p, prepNotes: e.target.value }))} />

        <button onClick={save} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 4, opacity: saving ? 0.6 : 1 }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </Modal>
    </div>
  )
}

// ─── Tab 3: Stock Movements ───────────────────────────────────────────────────

const TYPE_COLOR = { in: P.green, out: P.rose, waste: P.amber, adjustment: P.blue, transfer: P.teal }
const REASON_LABEL = { order_deduction: 'Order deduction', purchase: 'Purchase received', waste: 'Waste', manual_adjustment: 'Manual adjust', transfer: 'Transfer', opening_stock: 'Opening stock', expiry_disposal: 'Expiry disposal' }

function MovementsTab({ isDark }) {
  const [moves,    setMoves]    = useState([])
  const [ings,     setIngs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [typeF,    setTypeF]    = useState('')
  const [ingF,     setIngF]     = useState('')
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const [showWaste,setShowWaste]= useState(false)
  const [showManual,setShowManual] = useState(false)
  const [wForm,    setWForm]    = useState({ ingredientId: '', quantity: '', notes: '' })
  const [mForm,    setMForm]    = useState({ ingredientId: '', quantity: '', reason: 'manual_adjustment', notes: '' })
  const [saving,   setSaving]   = useState(false)
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: LIMIT }
    if (typeF) params.type         = typeF
    if (ingF)  params.ingredientId = ingF
    api.get('/inventory/movements', { params })
      .then(r => { setMoves(r.movements ?? r.data?.movements ?? []); setTotal(r.pagination?.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [typeF, ingF, page])

  useEffect(() => {
    api.get('/inventory/ingredients').then(r => setIngs(r.ingredients ?? r.data?.ingredients ?? [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const logWaste = async () => {
    if (!wForm.ingredientId || !wForm.quantity) return
    setSaving(true)
    try { await api.post('/inventory/movements/waste', wForm); setShowWaste(false); setWForm({ ingredientId: '', quantity: '', notes: '' }); load() }
    catch(e) { console.error(e) } finally { setSaving(false) }
  }

  const logManual = async () => {
    if (!mForm.ingredientId || mForm.quantity === '') return
    setSaving(true)
    try { await api.post('/inventory/movements/manual', { ...mForm, quantity: Number(mForm.quantity) }); setShowManual(false); setMForm({ ingredientId: '', quantity: '', reason: 'manual_adjustment', notes: '' }); load() }
    catch(e) { console.error(e) } finally { setSaving(false) }
  }

  const pages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1) }}
          style={{ ...inputSt(isDark), width: 120, marginBottom: 0, cursor: 'pointer' }}>
          <option value="">All types</option>
          {['in','out','waste','adjustment','transfer'].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={ingF} onChange={e => { setIngF(e.target.value); setPage(1) }}
          style={{ ...inputSt(isDark), flex: 1, minWidth: 140, marginBottom: 0, cursor: 'pointer' }}>
          <option value="">All ingredients</option>
          {ings.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
        <button onClick={load} style={btnGhost(isDark)}><RefreshCw size={12} /></button>
        <button onClick={() => setShowWaste(true)} style={{ ...btnGhost(isDark), color: P.amber, borderColor: `${P.amber}30` }}>
          <TrendingDown size={12} /> Log Waste
        </button>
        <button onClick={() => setShowManual(true)} style={{ ...btnGhost(isDark), color: P.blue, borderColor: `${P.blue}30` }}>
          <Edit3 size={12} /> Manual Adjust
        </button>
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 1fr', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)')}` }}>
          {['Ingredient','Type','Qty','Reason','Date'].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONTS.body }}>{h}</span>
          ))}
        </div>

        {loading ? <Skeleton isDark={isDark} h={40} n={6} /> : moves.length === 0 ? <Empty icon={ClipboardList} label="No movements found" isDark={isDark} /> : (
          moves.map((mv, i) => {
            const c = TYPE_COLOR[mv.type] ?? P.blue
            return (
              <div key={mv._id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 1fr', gap: 8, padding: '11px 16px', alignItems: 'center', borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.04)')}` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mv.ingredientId?.name ?? '—'}
                </p>
                <Pill label={mv.type} color={c} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: mv.quantity >= 0 ? P.green : P.rose, fontFamily: FONTS.body }}>
                  {mv.quantity >= 0 ? '+' : ''}{mv.quantity} {mv.unit}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                  {REASON_LABEL[mv.reason] ?? mv.reason}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                  {new Date(mv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnGhost(isDark)}>← Prev</button>
          <span style={{ fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, alignSelf: 'center' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnGhost(isDark)}>Next →</button>
        </div>
      )}

      {/* Waste Modal */}
      <Modal open={showWaste} onClose={() => setShowWaste(false)} title="Log Waste" isDark={isDark}>
        <Select label="Ingredient" isDark={isDark} value={wForm.ingredientId} onChange={e => setWForm(p => ({ ...p, ingredientId: e.target.value }))}>
          <option value="">Select ingredient…</option>
          {ings.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currentStock} {g.unit})</option>)}
        </Select>
        <Input label="Quantity wasted" isDark={isDark} type="number" placeholder="0" value={wForm.quantity} onChange={e => setWForm(p => ({ ...p, quantity: e.target.value }))} />
        <Input label="Notes (optional)" isDark={isDark} placeholder="Reason for waste" value={wForm.notes} onChange={e => setWForm(p => ({ ...p, notes: e.target.value }))} />
        <button onClick={logWaste} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${P.amber}, #B45309)`, opacity: saving ? 0.6 : 1 }}>
          <TrendingDown size={13} /> {saving ? 'Logging…' : 'Log Waste'}
        </button>
      </Modal>

      {/* Manual Adjustment Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="Manual Stock Adjustment" isDark={isDark}>
        <Select label="Ingredient" isDark={isDark} value={mForm.ingredientId} onChange={e => setMForm(p => ({ ...p, ingredientId: e.target.value }))}>
          <option value="">Select ingredient…</option>
          {ings.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currentStock} {g.unit})</option>)}
        </Select>
        <Input label="Quantity (positive = add, negative = remove)" isDark={isDark} type="number" placeholder="e.g. 5 or -2" value={mForm.quantity} onChange={e => setMForm(p => ({ ...p, quantity: e.target.value }))} />
        <Select label="Reason" isDark={isDark} value={mForm.reason} onChange={e => setMForm(p => ({ ...p, reason: e.target.value }))}>
          {['manual_adjustment','opening_stock','expiry_disposal','transfer'].map(r => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </Select>
        <Input label="Notes (optional)" isDark={isDark} placeholder="Any notes…" value={mForm.notes} onChange={e => setMForm(p => ({ ...p, notes: e.target.value }))} />
        <button onClick={logManual} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save Adjustment'}
        </button>
      </Modal>
    </div>
  )
}

// ─── Tab 4: Purchase Orders ───────────────────────────────────────────────────

const PO_STATUS_COLOR = { draft: P.blue, ordered: P.amber, partial: P.teal, received: P.green, cancelled: P.rose }

function PurchaseOrdersTab({ isDark }) {
  const [orders,   setOrders]   = useState([])
  const [ings,     setIngs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [statusF,  setStatusF]  = useState('')
  const [showModal,setShowModal]= useState(false)
  const [expanded, setExpanded] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ supplier: '', items: [{ ingredientId: '', orderedQty: '', unitCost: '', unit: '' }], notes: '', expectedAt: '' })

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusF) params.status = statusF
    api.get('/inventory/purchase-orders', { params })
      .then(r => setOrders(r.orders ?? r.data?.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusF])

  useEffect(() => {
    api.get('/inventory/ingredients').then(r => setIngs(r.ingredients ?? r.data?.ingredients ?? [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { ingredientId: '', orderedQty: '', unitCost: '', unit: '' }] }))
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const setItem    = (i, k, v) => setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))

  const save = async () => {
    if (!form.supplier.trim()) return
    const validItems = form.items.filter(it => it.ingredientId && it.orderedQty > 0 && it.unitCost >= 0 && it.unit)
    if (!validItems.length) return
    setSaving(true)
    try {
      await api.post('/inventory/purchase-orders', { ...form, items: validItems })
      setShowModal(false); setForm({ supplier: '', items: [{ ingredientId: '', orderedQty: '', unitCost: '', unit: '' }], notes: '', expectedAt: '' }); load()
    } catch(e) { console.error(e) } finally { setSaving(false) }
  }

  const markReceived = async (id) => {
    try { await api.patch(`/inventory/purchase-orders/${id}/receive`, {}); load() }
    catch(e) { console.error(e) }
  }

  const updateStatus = async (id, status) => { 
    try { await api.patch(`/inventory/purchase-orders/${id}/status`, { status }); load() }
    catch(e) { console.error(e) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          style={{ ...inputSt(isDark), width: 140, marginBottom: 0, cursor: 'pointer' }}>
          <option value="">All statuses</option>
          {['draft','ordered','partial','received','cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={load} style={btnGhost(isDark)}><RefreshCw size={12} /></button>
        <button onClick={() => setShowModal(true)} style={btnPrimary}><Plus size={13} /> New PO</button>
      </div>

      <div style={{ ...cardSt(isDark), overflow: 'hidden' }}>
        {loading ? <Skeleton isDark={isDark} n={3} h={64} /> : orders.length === 0 ? <Empty icon={Truck} label="No purchase orders yet" isDark={isDark} /> : (
          orders.map(po => {
            const sc = PO_STATUS_COLOR[po.status] ?? P.blue
            return (
              <div key={po._id} style={{ borderBottom: `1px solid ${dk(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}` }}>
                <div onClick={() => setExpanded(expanded === po._id ? null : po._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = dk(isDark, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.025)')}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${sc}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={15} style={{ color: sc }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>{po.poNumber}</p>
                      <Pill label={po.status} color={sc} />
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                      {po.supplier} · {po.items?.length ?? 0} items · Rs {po.totalCost?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body, flexShrink: 0 }}>
                    {new Date(po.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <ChevronDown size={14} style={{ color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), transform: expanded === po._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>

                {expanded === po._id && (
                  <div style={{ padding: '0 16px 14px 62px' }}>
                    {po.items?.map((it, j) => (
                      <div key={j} style={{ display: 'flex', gap: 12, padding: '6px 0', borderTop: j > 0 ? `1px solid ${dk(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}` : 'none', alignItems: 'center' }}>
                        <p style={{ flex: 1, margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
                          {it.ingredientId?.name ?? it.ingredientId}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
                          {it.orderedQty} {it.unit} · Rs {it.unitCost}/unit
                        </p>
                        {it.receivedQty > 0 && (
                          <Pill label={`${it.receivedQty} received`} color={P.green} />
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {po.status === 'draft' && (
                        <button onClick={() => updateStatus(po._id, 'ordered')} style={{ ...btnPrimary, fontSize: 11, padding: '7px 14px' }}>
                          Mark as Ordered
                        </button>
                      )}
                      {(po.status === 'ordered' || po.status === 'partial') && (
                        <button onClick={() => markReceived(po._id)} style={{ ...btnPrimary, fontSize: 11, padding: '7px 14px', background: `linear-gradient(135deg, ${P.green}, #15803D)` }}>
                          <CheckCircle2 size={12} /> Mark Received + Update Stock
                        </button>
                      )}
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(po._id, 'cancelled')} style={{ ...btnGhost(isDark), fontSize: 11, color: P.rose, borderColor: `${P.rose}30` }}>
                          Cancel PO
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Create PO Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Order" isDark={isDark}>
        <Input label="Supplier" isDark={isDark} placeholder="Supplier name" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} />
        <Input label="Expected delivery (optional)" isDark={isDark} type="date" value={form.expectedAt} onChange={e => setForm(p => ({ ...p, expectedAt: e.target.value }))} />

        <Label isDark={isDark}>Line Items</Label>
        {form.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 70px 80px 70px 24px', gap: 6, marginBottom: 8, alignItems: 'end' }}>
            <select value={it.ingredientId} onChange={e => setItem(i, 'ingredientId', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0, cursor: 'pointer', fontSize: 11 }}>
              <option value="">Ingredient…</option>
              {ings.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
            <input type="number" placeholder="Qty" value={it.orderedQty} onChange={e => setItem(i, 'orderedQty', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0 }} />
            <input type="number" placeholder="Cost/unit" value={it.unitCost} onChange={e => setItem(i, 'unitCost', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0 }} />
            <input placeholder="Unit" value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)} style={{ ...inputSt(isDark), marginBottom: 0 }} />
            <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.rose, paddingBottom: 2 }}><X size={13} /></button>
          </div>
        ))}
        <button onClick={addItem} style={{ ...btnGhost(isDark), marginBottom: 12, fontSize: 11 }}>
          <Plus size={11} /> Add line item
        </button>

        <Input label="Notes (optional)" isDark={isDark} placeholder="Any notes for supplier…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />

        <button onClick={save} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
          <Save size={13} /> {saving ? 'Creating…' : 'Create Purchase Order'}
        </button>
      </Modal>
    </div>
  )
}

// ─── Main InventoryPanel ──────────────────────────────────────────────────────

const TABS = [
  { key: 'ingredients', label: 'Ingredients', Icon: Package },
  { key: 'recipes',     label: 'Recipes',     Icon: Beaker  },
  { key: 'movements',   label: 'Movements',   Icon: ClipboardList },
  { key: 'orders',      label: 'Purchase Orders', Icon: Truck },
]

export default function InventoryPanel() {
  const { isDark } = useContext(ThemeContext)
  const [tab, setTab] = useState('ingredients')
  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    if (wrapRef.current) gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 })
  }, [tab])

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <style>{`@keyframes inv-pulse { 0%,100%{opacity:.45} 50%{opacity:.18} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: dk(isDark, COLORS.dark.text, COLORS.brew.DEFAULT), fontFamily: FONTS.body }}>
            Inventory
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: dk(isDark, COLORS.dark.muted, COLORS.brew.soft), fontFamily: FONTS.body }}>
            Module 20 — Ingredient-level inventory management
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 10, background: `${P.green}10`, border: `1px solid ${P.green}20` }}>
          <CheckCircle2 size={11} style={{ color: P.green }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: P.green, fontFamily: FONTS.body }}>Auto-deduction active</span>
        </div>
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

      {/* Tab content */}
      <div ref={wrapRef}>
        {tab === 'ingredients' && <IngredientsTab isDark={isDark} />}
        {tab === 'recipes'     && <RecipesTab     isDark={isDark} />}
        {tab === 'movements'   && <MovementsTab   isDark={isDark} />}
        {tab === 'orders'      && <PurchaseOrdersTab isDark={isDark} />}
      </div>
    </div>
  )
}