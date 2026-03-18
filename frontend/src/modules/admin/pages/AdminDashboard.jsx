// src/modules/admin/pages/AdminDashboard.jsx
//
// ✅ COLORS import removed throughout
// ✅ StatCard: bg-white, border-gray-100 → var(--card-bg/card-border/card-shadow)
// ✅ COLORS.saffron/matcha/brew/terra → var(--accent/success/text-primary/danger)
// ✅ Nav tab active → var(--accent-gradient), inactive → var(--text-muted)
// ✅ bg-white tables → var(--card-bg), border-gray-100 → var(--card-border)
// ✅ text-brew/text-brew-soft → var(--text-primary/muted)
// ✅ bg-cream-deep skeleton → .skeleton class
// ✅ divide-gray-50 / bg-gray-50 → var(--divider/pill-bg)
// ✅ 'Rs' → BRAND.currency

import { useState, useEffect, useContext } from 'react'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import { ThemeContext } from '@shared/context/ThemeContext'
import { BRAND }        from '@shared/config/brand'
import api              from '@api/axios'
import { Users, ShoppingBag, Monitor, Activity, ToggleLeft, ToggleRight } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div
    className="rounded-2xl border p-5 flex items-center gap-4"
    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
  >
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18` }}
    >
      <Icon size={22} color={color} />
    </div>
    <div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  </div>
)

const AdminDashboard = () => {
  const { isDark }  = useContext(ThemeContext)
  const [stats,    setStats]   = useState(null)
  const [usage,    setUsage]   = useState(null)
  const [users,    setUsers]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [section,  setSection] = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/usage'),
      api.get('/admin/users?limit=20'),
    ])
      .then(([s, u, us]) => {
        setStats(s.stats)
        setUsage(u.usage)
        setUsers(us.users || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleUser = async (id, current) => {
    await api.patch(`/admin/users/${id}/toggle-active`)
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !current } : u))
  }

  return (
    <DashboardLayout title="Admin Panel" role="admin">
      {/* Nav tabs */}
      <div
        className="flex gap-1 border-b px-4 py-2 sticky top-0 z-10"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        {[['overview', 'Overview'], ['users', 'Users'], ['activity', 'Activity']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={
              section === key
                ? { background: 'var(--accent-gradient)', color: 'var(--text-inverse)' }
                : { color: 'var(--text-muted)', background: 'transparent' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6" style={{ background: 'var(--bg)' }}>

        {/* Overview */}
        {section === 'overview' && (
          <>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Platform Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users}       label="Total Users"      value={stats?.totalUsers}      color="var(--accent)"  />
              <StatCard icon={ShoppingBag} label="Total Orders"     value={stats?.totalOrders}     color="var(--success)" />
              <StatCard icon={Monitor}     label="Active Sessions"  value={stats?.activeSessions}  color="var(--text-primary)" />
              <StatCard icon={Activity}    label="Orders Today"     value={usage?.ordersToday}     color="var(--danger)"  />
            </div>
            {usage && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Activity} label="Sessions Today"  value={usage.sessionsToday}  color="var(--accent)"  />
                <StatCard icon={Users}    label="New Users Today" value={usage.newUsersToday}  color="var(--success)" />
              </div>
            )}
          </>
        )}

        {/* Users */}
        {section === 'users' && (
          <>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h2>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
            >
              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl skeleton" />)}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                  {users.map(u => (
                    <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {u.name || 'Guest'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {u.email} · <span className="capitalize">{u.role}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={
                            u.isActive
                              ? { background: 'var(--success-bg)', color: 'var(--success)' }
                              : { background: 'var(--danger-bg)',  color: 'var(--danger)'  }
                          }
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                        <button onClick={() => toggleUser(u._id, u.isActive)}>
                          {u.isActive
                            ? <ToggleRight size={20} color="var(--success)" />
                            : <ToggleLeft  size={20} color="var(--text-muted)" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Activity */}
        {section === 'activity' && (
          <>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
            <ActivityFeed />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

const ActivityFeed = () => {
  const [orders, setOrders] = useState([])
  useEffect(() => {
    api.get('/admin/activity').then(d => setOrders(d.orders || [])).catch(() => {})
  }, [])

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="divide-y max-h-[60vh] overflow-auto" style={{ borderColor: 'var(--divider)' }}>
        {orders.map(o => (
          <div key={o._id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg">📦</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Order #{o._id.slice(-6).toUpperCase()}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {o.customerId?.name || 'Guest'} · {new Date(o.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {BRAND.currency} {o.total}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{o.status}</p>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No activity</div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard