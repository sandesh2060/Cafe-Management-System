// src/modules/manager/components/staff/StaffList.jsx
// ═══════════════════════════════════════════════════════════════════════════
//  Premium design · Unified design system · Rich GSAP animations
//  Full dark / light · Espresso / eggshell palette
//  API: GET /staff         → { staff:[{_id,name,username,role,isActive}] }
//       POST /staff        → create
//       PATCH /staff/:id   → { isActive }
//       POST /staff/:id/reset-password → { password }
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api from '@api/axios'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import {
  Plus, ToggleLeft, ToggleRight, Key,
  Users, X, ChevronDown, UserCheck, UserX,
  Search, ShieldCheck,
} from 'lucide-react'
import {
  T, tv, glass, GlassCard, SecHead, Badge, Skeleton,
  Divider, GlobalStyles, BtnPrimary, BtnGhost, Input,
  Select, IconBtn, AnimCounter,
} from '../../../../shared/components/ui/ui'

// ─── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META = {
  waiter:  { color: T.saffron, label: 'Waiter',  grad: `${T.saffron}, ${T.terra}` },
  kitchen: { color: T.terra,   label: 'Kitchen', grad: `${T.terra}, #C04418` },
  cashier: { color: T.matcha,  label: 'Cashier', grad: `${T.matcha}, #1B6B3A` },
  manager: { color: T.purple,  label: 'Manager', grad: `${T.purple}, #5848C0` },
}

const EMPTY_FORM = { name: '', username: '', password: '', role: 'waiter' }

// ─── Role badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] ?? { color: T.dMuted, label: role }
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 99,
      background: `${meta.color}18`, color: meta.color,
      fontFamily: 'DM Sans, sans-serif', border: `1px solid ${meta.color}28`,
    }}>{meta.label}</span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span style={{
    fontSize: 9, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 99, fontFamily: 'DM Sans, sans-serif',
    background: active ? `${T.matcha}18` : 'rgba(214,64,69,0.12)',
    color: active ? T.matcha : T.crimson,
    border: `1px solid ${active ? T.matcha + '28' : 'rgba(214,64,69,0.22)'}`,
  }}>{active ? 'Active' : 'Disabled'}</span>
)

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, role, size = 38 }) => {
  const meta = ROLE_META[role] ?? { grad: `${T.saffron}, ${T.terra}` }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.33, flexShrink: 0,
      background: `linear-gradient(135deg, ${meta.grad})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38, fontFamily: 'DM Sans,sans-serif',
      boxShadow: `0 4px 14px ${meta.color ?? T.saffron}30`,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────
const Field = ({ label, isDark, children }) => (
  <div>
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 5px', color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>
      {label}
    </p>
    {children}
  </div>
)

// ─── Staff row ────────────────────────────────────────────────────────────────
const StaffRow = ({ s, onToggle, onReset, isDark, index }) => {
  const ref = useRef(null)

  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: 14, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, delay: index * 0.055, ease: 'back.out(1.5)' }
    )
  }, [])

  const handleToggle = async () => {
    // Animate feedback
    gsap.timeline()
      .to(ref.current, { x: 5, duration: 0.08 })
      .to(ref.current, { x: -3, duration: 0.08 })
      .to(ref.current, { x: 0, duration: 0.12 })
    await onToggle(s._id, s.isActive)
  }

  return (
    <div ref={ref}
      onMouseEnter={() => gsap.to(ref.current, { x: 2, duration: 0.18, ease: 'power2.out' })}
      onMouseLeave={() => gsap.to(ref.current, { x: 0, duration: 0.22, ease: 'power2.out' })}
      style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '12px 16px',
        borderBottom: `1px solid ${tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}`,
        cursor: 'default',
        opacity: s.isActive ? 1 : 0.65,
        transition: 'opacity 0.3s',
      }}
    >
      {/* Avatar */}
      <Avatar name={s.name} role={s.role} size={40} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: tv(isDark, '#F0E4C8', '#1A0E04'), fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.name}
          </p>
          <RoleBadge role={s.role} />
        </div>
        <p style={{ fontSize: 11, margin: '2px 0 0', color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>
          @{s.username}
        </p>
      </div>

      {/* Status + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <StatusBadge active={s.isActive} />
        <IconBtn isDark={isDark} onClick={() => onReset(s._id)} title="Reset password" color={T.saffron}>
          <Key size={14} />
        </IconBtn>
        <IconBtn
          isDark={isDark}
          onClick={handleToggle}
          title={s.isActive ? 'Disable account' : 'Enable account'}
          color={s.isActive ? T.crimson : T.matcha}
        >
          {s.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
        </IconBtn>
      </div>
    </div>
  )
}

// ─── Add staff form ───────────────────────────────────────────────────────────
const AddForm = ({ isDark, onClose, onCreated }) => {
  const ref    = useRef(null)
  const [form, setForm]   = useState(EMPTY_FORM)
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: -12, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
    )
  }, [])

  const close = () => {
    gsap.to(ref.current, { opacity: 0, y: -8, scale: 0.97, duration: 0.25, ease: 'power2.in', onComplete: onClose })
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password)
      return toast.error('Name, username and password required')
    if (form.password.length < 6) return toast.error('Password min 6 chars')
    setBusy(true)
    try {
      await api.post('/staff', form)
      toast.success(`${form.name} added!`)
      onCreated(); close()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create staff')
    }
    setBusy(false)
  }

  return (
    <div ref={ref} style={{ ...glass(isDark, { radius: 20 }), padding: '18px', marginBottom: 10 }}>
      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${T.saffron}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={15} color={T.saffron} />
          </div>
          <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: 16, fontWeight: 800, margin: 0, color: tv(isDark, T.dText, T.lText) }}>New Staff Member</h3>
        </div>
        <IconBtn isDark={isDark} onClick={close}>
          <X size={14} />
        </IconBtn>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Display Name" isDark={isDark}>
          <Input isDark={isDark} placeholder="e.g. Hari Prasad" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Username" isDark={isDark}>
          <Input isDark={isDark} placeholder="letters, numbers, _ . -" value={form.username} onChange={set('username')} autoCapitalize="none" autoCorrect="off" />
        </Field>
        <Field label="Password" isDark={isDark}>
          <Input isDark={isDark} type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Role" isDark={isDark}>
          <Select isDark={isDark} value={form.role} onChange={set('role')}>
            {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </div>

      {/* Role preview */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)'), display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={form.name || '?'} role={form.role} size={36} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: tv(isDark, T.dText, T.lText), fontFamily: 'DM Sans,sans-serif' }}>{form.name || 'Preview'}</p>
          <p style={{ fontSize: 10, margin: '2px 0 0', color: tv(isDark, T.dMuted, T.lMuted) }}>@{form.username || 'username'} · <span style={{ textTransform: 'capitalize' }}>{form.role}</span></p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <BtnPrimary style={{ flex: 1 }} onClick={submit} disabled={busy}>
          {busy ? 'Creating…' : 'Create Staff Member'}
        </BtnPrimary>
        <BtnGhost isDark={isDark} style={{ flex: 0 }} onClick={close}>
          Cancel
        </BtnGhost>
      </div>
    </div>
  )
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
const StatsStrip = ({ staff, isDark }) => {
  const activeCount = staff.filter(s => s.isActive).length
  const roles = Object.keys(ROLE_META).map(r => ({ role: r, count: staff.filter(s => s.role === r).length })).filter(x => x.count > 0)

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      {[
        { label: 'Total Staff', value: staff.length,              color: T.saffron },
        { label: 'Active',      value: activeCount,               color: T.matcha  },
        { label: 'Disabled',    value: staff.length - activeCount, color: T.crimson },
      ].map(({ label, value, color }, i) => (
        <div key={i} style={{
          flex: '1 1 80px', ...glass(isDark, { radius: 14 }),
          padding: '10px 14px', borderLeft: `3px solid ${color}`,
          display: 'flex', flexDirection: 'column', gap: 3,
          animation: `kc-fadein 0.4s ease ${i * 0.06}s both`,
        }}>
          <p style={{ fontSize: 18, fontWeight: 900, margin: 0, color: tv(isDark, T.dText, T.lText), fontFamily: 'DM Sans,sans-serif', letterSpacing: '-0.5px' }}>
            <AnimCounter value={value} />
          </p>
          <p style={{ fontSize: 9, fontWeight: 700, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase', color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const StaffList = () => {
  const { isDark } = useContext(ThemeContext)
  const [staff,    setStaff]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [adding,   setAdding]  = useState(false)
  const [search,   setSearch]  = useState('')
  const [filter,   setFilter]  = useState('all') // all | active | disabled
  const [roleFilter, setRoleFilter] = useState('all')

  const headerRef = useRef(null)
  const listRef   = useRef(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get('/staff')
      setStaff(d.data?.staff ?? d.staff ?? [])
    } catch { toast.error('Failed to load staff') }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    gsap.fromTo(headerRef.current, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' })
  }, [])

  const toggleActive = async (id, current) => {
    try {
      await api.patch(`/staff/${id}`, { isActive: !current })
      setStaff(prev => prev.map(s => s._id === id ? { ...s, isActive: !current } : s))
      toast.success(current ? 'Account disabled' : 'Account enabled')
    } catch { toast.error('Failed to update status') }
  }

  const resetPassword = async (id) => {
    const pw = prompt('New password (min 6 chars):')
    if (!pw || pw.length < 6) return
    try {
      await api.post(`/staff/${id}/reset-password`, { password: pw })
      toast.success('Password reset!')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  // Filter + search
  const filtered = staff.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.username.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filter === 'all' || (filter === 'active' ? s.isActive : !s.isActive)
    const matchRole   = roleFilter === 'all' || s.role === roleFilter
    return matchSearch && matchStatus && matchRole
  })

  if (loading) return (
    <div>
      <GlobalStyles />
      <Skeleton h={34} isDark={isDark} mb={14} radius={10} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[0,1,2].map(i => <Skeleton key={i} h={58} isDark={isDark} mb={0} radius={14} />)}
      </div>
      <Skeleton h={320} isDark={isDark} mb={0} />
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalStyles />

      {/* Header */}
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: tv(isDark, T.dText, T.lText) }}>
            Staff
          </h2>
          <p style={{ fontSize: 11, margin: '3px 0 0', color: tv(isDark, T.dMuted, T.lMuted) }}>
            {staff.length} members · {staff.filter(s => s.isActive).length} active
          </p>
        </div>
        <BtnPrimary onClick={() => setAdding(a => !a)}>
          <Plus size={15} />
          {adding ? 'Close Form' : 'Add Staff'}
        </BtnPrimary>
      </div>

      {/* Stats strip */}
      {staff.length > 0 && <StatsStrip staff={staff} isDark={isDark} />}

      {/* Add form */}
      {adding && <AddForm isDark={isDark} onClose={() => setAdding(false)} onCreated={refresh} />}

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '1 1 180px', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: tv(isDark, T.dMuted, T.lMuted), pointerEvents: 'none' }} />
          <Input isDark={isDark} placeholder="Search name or username…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, fontSize: 12, padding: '9px 12px 9px 34px' }} />
        </div>
        {/* Status filter */}
        {['all','active','disabled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            border: filter === f ? 'none' : `1px solid ${tv(isDark, 'rgba(255,255,255,0.09)', 'rgba(0,0,0,0.09)')}`,
            background: filter === f ? `linear-gradient(135deg, ${T.saffron}, ${T.terra})` : tv(isDark, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.65)'),
            color: filter === f ? '#fff' : tv(isDark, '#9E7D5A', '#7A5C3A'),
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            boxShadow: filter === f ? `0 3px 12px ${T.saffron}40` : 'none',
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Role filter row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(ROLE_META)].map(r => {
          const isAll = r === 'all'
          const active = roleFilter === r
          const clr = isAll ? T.saffron : ROLE_META[r].color
          return (
            <button key={r} onClick={() => setRoleFilter(r)} style={{
              padding: '5px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              border: `1px solid ${active ? clr + '40' : tv(isDark, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.07)')}`,
              background: active ? `${clr}18` : 'transparent',
              color: active ? clr : tv(isDark, T.dMuted, T.lMuted),
              cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', textTransform: 'capitalize',
              letterSpacing: '0.3px',
            }}>{isAll ? 'All Roles' : ROLE_META[r].label}</button>
          )
        })}
      </div>

      {/* Staff list */}
      <GlassCard isDark={isDark} style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 10 }}>
            <Users size={32} color={tv(isDark, T.dFaint, '#D4BFA0')} strokeWidth={1.3} />
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: tv(isDark, T.dMuted, T.lMuted) }}>
              {staff.length === 0 ? 'No staff members yet' : 'No results match your filters'}
            </p>
            <p style={{ fontSize: 12, margin: 0, color: tv(isDark, T.dFaint, T.lFaint) }}>
              {staff.length === 0 ? 'Add your first team member above' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div ref={listRef}>
            {filtered.map((s, i) => (
              <StaffRow key={s._id} s={s} index={i} onToggle={toggleActive} onReset={resetPassword} isDark={isDark} />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p style={{ fontSize: 11, margin: '10px 0 0', color: tv(isDark, T.dFaint, T.lMuted), textAlign: 'right', fontFamily: 'DM Sans,sans-serif' }}>
          Showing {filtered.length} of {staff.length} staff members
        </p>
      )}
    </div>
  )
}

export default StaffList