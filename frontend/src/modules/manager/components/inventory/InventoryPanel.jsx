// src/modules/manager/components/inventory/InventoryPanel.jsx
import { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api   from '@api/axios'
import gsap  from 'gsap'
import toast from 'react-hot-toast'
import { COLORS } from '@colors'
import { Plus, AlertTriangle, Package, Minus, Trash2, X } from 'lucide-react'

const EMPTY_FORM = { name: '', unit: 'pcs', quantity: 0, lowThreshold: 10 }

const InputField = ({ label, ...props }) => {
  const { isDark } = useContext(ThemeContext)
  return (
    <div>
      {label && (
        <label className="text-xs font-semibold mb-1 block" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
          {label}
        </label>
      )}
      <input
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-all"
        style={{
          backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.DEFAULT,
          borderColor:     isDark ? COLORS.dark.border   : COLORS.cream.border,
          color:           isDark ? COLORS.dark.text      : COLORS.brew.DEFAULT,
        }}
        {...props}
      />
    </div>
  )
}

const InventoryItem = ({ item, onUpdateQty, onDelete, index, isDark }) => {
  const rowRef  = useRef(null)
  const isLow   = item.quantity <= item.lowThreshold
  const isCritical = item.quantity === 0

  useEffect(() => {
    if (!rowRef.current) return
    gsap.fromTo(
      rowRef.current,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.3, delay: index * 0.04, ease: 'power2.out' }
    )
  }, [index])

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: `1px solid ${isDark ? COLORS.dark.border : COLORS.cream.border}` }}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: isCritical
            ? COLORS.status.error
            : isLow
            ? COLORS.status.warning
            : COLORS.matcha.DEFAULT,
        }}
      />

      {/* Name + unit */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            {item.name}
          </p>
          {isCritical && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">OUT</span>
          )}
          {!isCritical && isLow && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.status.warningBg, color: COLORS.status.warning }}>
              LOW
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
          Alert at {item.lowThreshold} {item.unit}
        </p>
      </div>

      {/* Qty control */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdateQty(item._id, item.quantity, -1)}
          disabled={item.quantity === 0}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
          style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.deep }}
        >
          <Minus size={12} color={isDark ? COLORS.dark.muted : COLORS.brew.soft} />
        </button>
        <span
          className="w-14 text-center font-bold text-sm"
          style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}
        >
          {item.quantity} <span className="text-xs font-normal" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>{item.unit}</span>
        </span>
        <button
          onClick={() => onUpdateQty(item._id, item.quantity, +1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ backgroundColor: COLORS.saffron.DEFAULT }}
        >
          <Plus size={12} color="#fff" />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item._id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 ml-1"
        style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.deep }}
      >
        <Trash2 size={12} color={COLORS.status.error} />
      </button>
    </div>
  )
}

const InventoryPanel = () => {
  const { isDark } = useContext(ThemeContext)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const formRef   = useRef(null)
  const alertRef  = useRef(null)

  const refresh = useCallback(() => {
    api.get('/inventory')
      .then((d) => setItems(d.items || d.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Animate form in/out
  useEffect(() => {
    if (!formRef.current) return
    if (adding) {
      gsap.fromTo(formRef.current, { opacity: 0, y: -12, height: 0 }, { opacity: 1, y: 0, height: 'auto', duration: 0.3, ease: 'power2.out' })
    } else {
      gsap.to(formRef.current, { opacity: 0, y: -8, height: 0, duration: 0.2, ease: 'power2.in' })
    }
  }, [adding])

  // Animate alert banner
  useEffect(() => {
    if (alertRef.current && lowItems.length > 0) {
      gsap.fromTo(alertRef.current, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' })
    }
  }, [loading])

  const updateQty = async (id, current, delta) => {
    const qty = Math.max(0, current + delta)
    try {
      await api.patch(`/inventory/${id}`, { quantity: qty })
      setItems((prev) => prev.map((i) => i._id === id ? { ...i, quantity: qty } : i))
    } catch {
      toast.error('Failed to update quantity')
    }
  }

  const deleteItem = async (id) => {
    try {
      await api.delete(`/inventory/${id}`)
      setItems((prev) => prev.filter((i) => i._id !== id))
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const createItem = async () => {
    if (!form.name.trim()) return toast.error('Name required')
    try {
      await api.post('/inventory', form)
      setAdding(false)
      setForm(EMPTY_FORM)
      refresh()
      toast.success('Item added!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add item')
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const lowItems   = items.filter((i) => i.quantity > 0 && i.quantity <= i.lowThreshold)
  const emptyItems = items.filter((i) => i.quantity === 0)
  const okItems    = items.filter((i) => i.quantity > i.lowThreshold)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            Inventory
          </h2>
          <p className="text-xs mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
            {items.length} items tracked
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: adding ? 'transparent' : `linear-gradient(135deg, ${COLORS.saffron.DEFAULT}, ${COLORS.terra.DEFAULT})`,
            color:      adding ? (isDark ? COLORS.dark.muted : COLORS.brew.soft) : '#fff',
            border:     adding ? `1px solid ${isDark ? COLORS.dark.border : COLORS.cream.border}` : 'none',
          }}
        >
          {adding ? <X size={15} /> : <Plus size={15} />}
          {adding ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Alert banner */}
      {(lowItems.length > 0 || emptyItems.length > 0) && !loading && (
        <div
          ref={alertRef}
          className="rounded-2xl p-3 flex items-start gap-2.5"
          style={{
            backgroundColor: isDark ? '#2D0A0A' : COLORS.status.errorBg,
            border:          `1px solid ${isDark ? '#7F1D1D' : COLORS.border.error}`,
          }}
        >
          <AlertTriangle size={16} color={COLORS.status.error} className="flex-shrink-0 mt-0.5" />
          <div>
            {emptyItems.length > 0 && (
              <p className="font-bold text-sm" style={{ color: COLORS.status.error }}>
                {emptyItems.length} item{emptyItems.length > 1 ? 's' : ''} out of stock
              </p>
            )}
            {lowItems.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: isDark ? '#FCA5A5' : COLORS.terra.dark }}>
                Low: {lowItems.map((i) => i.name).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      <div ref={formRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{
            backgroundColor: isDark ? COLORS.dark.surface : '#fff',
            borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
          }}
        >
          <h3 className="font-bold text-sm" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            New Inventory Item
          </h3>
          <InputField label="Item name" placeholder="e.g. Coffee Beans" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-3 gap-2">
            <InputField label="Unit" placeholder="pcs" value={form.unit} onChange={set('unit')} />
            <InputField label="Quantity" type="number" placeholder="0" value={form.quantity} onChange={set('quantity')} />
            <InputField label="Alert at" type="number" placeholder="10" value={form.lowThreshold} onChange={set('lowThreshold')} />
          </div>
          <button
            onClick={createItem}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-98"
            style={{ background: `linear-gradient(135deg, ${COLORS.saffron.DEFAULT}, ${COLORS.terra.DEFAULT})` }}
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: `${okItems.length} OK`,    color: COLORS.matcha.DEFAULT   },
            { label: `${lowItems.length} Low`,  color: COLORS.status.warning   },
            { label: `${emptyItems.length} Out`, color: COLORS.status.error    },
          ].map(({ label, color }) => (
            <span
              key={label}
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: color + '18', color }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Items list */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: isDark ? COLORS.dark.surface : '#fff',
          borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
          boxShadow:       COLORS.shadows.card,
        }}
      >
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.deep }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2">
            <Package size={32} color={isDark ? COLORS.dark.muted : COLORS.brew.soft} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
              No inventory items
            </p>
          </div>
        ) : (
          <div>
            {/* Out of stock */}
            {emptyItems.map((item, i) => (
              <InventoryItem key={item._id} item={item} index={i} isDark={isDark} onUpdateQty={updateQty} onDelete={deleteItem} />
            ))}
            {/* Low stock */}
            {lowItems.map((item, i) => (
              <InventoryItem key={item._id} item={item} index={emptyItems.length + i} isDark={isDark} onUpdateQty={updateQty} onDelete={deleteItem} />
            ))}
            {/* OK items */}
            {okItems.map((item, i) => (
              <InventoryItem key={item._id} item={item} index={emptyItems.length + lowItems.length + i} isDark={isDark} onUpdateQty={updateQty} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryPanel