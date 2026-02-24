// src/modules/manager/components/inventory/InventoryPanel.jsx
import { useState, useEffect, useCallback } from 'react'
import api   from '@api/axios'
import toast from 'react-hot-toast'
import { Plus, AlertTriangle } from 'lucide-react'

const InventoryPanel = () => {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ name: '', unit: 'pcs', quantity: 0, lowThreshold: 10 })

  const refresh = useCallback(() => {
    api.get('/inventory').then((d) => setItems(d.items || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const updateQty = async (id, delta) => {
    const item = items.find((i) => i._id === id)
    const qty  = Math.max(0, (item?.quantity || 0) + delta)
    await api.patch(`/inventory/${id}`, { quantity: qty })
    setItems((prev) => prev.map((i) => i._id === id ? { ...i, quantity: qty } : i))
  }

  const createItem = async () => {
    if (!form.name) return toast.error('Name required')
    await api.post('/inventory', form)
    setAdding(false)
    setForm({ name: '', unit: 'pcs', quantity: 0, lowThreshold: 10 })
    refresh()
    toast.success('Item added')
  }

  const lowItems = items.filter((i) => i.quantity <= i.lowThreshold)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brew">Inventory</h2>
        <button onClick={() => setAdding(!adding)} className="btn-brand px-4 py-2 text-sm gap-1.5">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {lowItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">{lowItems.length} low stock alert{lowItems.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600">{lowItems.map((i) => i.name).join(', ')}</p>
          </div>
        </div>
      )}

      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <input placeholder="Item name" value={form.name} onChange={(e) => setForm((f) => ({...f,name:e.target.value}))} className="input-base text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Unit" value={form.unit} onChange={(e) => setForm((f) => ({...f,unit:e.target.value}))} className="input-base text-sm" />
            <input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm((f) => ({...f,quantity:+e.target.value}))} className="input-base text-sm" />
            <input type="number" placeholder="Alert at" value={form.lowThreshold} onChange={(e) => setForm((f) => ({...f,lowThreshold:+e.target.value}))} className="input-base text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createItem} className="btn-brand flex-1 py-2.5 text-sm">Add</button>
            <button onClick={() => setAdding(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-cream-deep rounded-xl animate-pulse" />)}</div>
        : items.length === 0 ? <div className="py-8 text-center text-brew-soft text-sm">No inventory items</div>
        : <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item._id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brew">{item.name}</p>
                    {item.quantity <= item.lowThreshold && <span className="text-[10px] text-red-500 font-bold">LOW</span>}
                  </div>
                  <p className="text-xs text-brew-soft">Alert at: {item.lowThreshold} {item.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item._id, -1)} className="w-7 h-7 rounded-lg bg-cream-dark text-brew-soft font-bold text-lg leading-none flex items-center justify-center">−</button>
                  <span className="w-12 text-center font-bold text-brew text-sm">{item.quantity} {item.unit}</span>
                  <button onClick={() => updateQty(item._id, +1)} className="w-7 h-7 rounded-lg bg-saffron text-white font-bold flex items-center justify-center">+</button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}

export default InventoryPanel