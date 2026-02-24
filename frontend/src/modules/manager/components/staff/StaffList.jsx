// src/modules/manager/components/staff/StaffList.jsx
import { useState, useEffect, useCallback } from 'react'
import api     from '@api/axios'
import { COLORS } from '@colors'
import { Plus, User, ToggleLeft, ToggleRight, Key } from 'lucide-react'
import toast   from 'react-hot-toast'

const ROLE_COLOR = {
  waiter:  COLORS.saffron.DEFAULT,
  kitchen: COLORS.terra.DEFAULT,
  cashier: COLORS.matcha.DEFAULT,
  manager: COLORS.brew.DEFAULT,
}

const StaffList = () => {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'waiter' })

  const refresh = useCallback(() => {
    api.get('/staff').then((d) => setStaff(d.staff || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const toggleActive = async (id, current) => {
    await api.patch(`/staff/${id}/toggle-active`)
    setStaff((prev) => prev.map((s) => s._id === id ? { ...s, isActive: !current } : s))
  }

  const resetPassword = async (id) => {
    const newPw = prompt('New password (min 6 chars):')
    if (!newPw || newPw.length < 6) return
    await api.post(`/staff/${id}/reset-password`, { newPassword: newPw })
    toast.success('Password reset!')
  }

  const createStaff = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('All fields required')
    try {
      await api.post('/staff', form)
      toast.success('Staff created!')
      setAdding(false)
      setForm({ name: '', email: '', password: '', role: 'waiter' })
      refresh()
    } catch (e) {
      toast.error(e.message || 'Failed to create')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brew">Staff ({staff.length})</h2>
        <button onClick={() => setAdding(!adding)} className="btn-brand px-4 py-2 text-sm gap-1.5">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-brew text-sm">New Staff Member</h3>
          {[['name','Name','text'],['email','Email','email'],['password','Password','password']].map(([k,l,t]) => (
            <input key={k} type={t} placeholder={l} value={form[k]} onChange={(e) => setForm((f) => ({...f,[k]:e.target.value}))} className="input-base text-sm" />
          ))}
          <select value={form.role} onChange={(e) => setForm((f) => ({...f,role:e.target.value}))} className="input-base text-sm">
            {['waiter','kitchen','cashier','manager'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={createStaff} className="btn-brand flex-1 py-2.5 text-sm">Create</button>
            <button onClick={() => setAdding(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-14 bg-cream-deep rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map((s) => (
              <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: ROLE_COLOR[s.role] || COLORS.brew.light }}>
                  {s.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brew text-sm">{s.name}</p>
                  <p className="text-xs text-brew-soft truncate">{s.email} · <span className="capitalize">{s.role}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => resetPassword(s._id)} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center" title="Reset password">
                    <Key size={14} color={COLORS.brew.soft} />
                  </button>
                  <button onClick={() => toggleActive(s._id, s.isActive)} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center">
                    {s.isActive ? <ToggleRight size={18} color={COLORS.matcha.DEFAULT} /> : <ToggleLeft size={18} color={COLORS.brew.soft} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffList