// src/modules/admin/pages/AdminDashboard.jsx
// Admin is ALWAYS SILENT — no sounds, no chat, no notification bell.
import { useState, useEffect } from 'react'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import api from '@api/axios'
import { COLORS } from '@colors'
import { Users, ShoppingBag, Monitor, Activity, ToggleLeft, ToggleRight } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p className="text-2xl font-bold text-brew">{value ?? '—'}</p>
      <p className="text-xs text-brew-soft">{label}</p>
    </div>
  </div>
)

const AdminDashboard = () => {
  const [stats,   setStats]   = useState(null)
  const [usage,   setUsage]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('overview')

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/admin/usage'), api.get('/admin/users?limit=20')])
      .then(([s, u, us]) => { setStats(s.stats); setUsage(u.usage); setUsers(us.users || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleUser = async (id, current) => {
    await api.patch(`/admin/users/${id}/toggle-active`)
    setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: !current } : u))
  }

  return (
    <DashboardLayout title="Admin Panel" role="admin">
      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-gray-100 px-4 py-2 bg-white sticky top-0 z-10">
        {[['overview','Overview'],['users','Users'],['activity','Activity']].map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={section === key ? { backgroundColor: COLORS.saffron.DEFAULT, color: '#fff' } : { color: COLORS.brew.soft }}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Overview */}
        {section === 'overview' && (
          <>
            <h2 className="text-xl font-bold text-brew">Platform Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users}       label="Total Users"      value={stats?.totalUsers}       color={COLORS.saffron.DEFAULT} />
              <StatCard icon={ShoppingBag} label="Total Orders"     value={stats?.totalOrders}      color={COLORS.matcha.DEFAULT}  />
              <StatCard icon={Monitor}     label="Active Sessions"  value={stats?.activeSessions}   color={COLORS.brew.DEFAULT}    />
              <StatCard icon={Activity}    label="Orders Today"     value={usage?.ordersToday}      color={COLORS.terra.DEFAULT}   />
            </div>
            {usage && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Activity} label="Sessions Today"  value={usage.sessionsToday}  color={COLORS.saffron.DEFAULT} />
                <StatCard icon={Users}    label="New Users Today" value={usage.newUsersToday}  color={COLORS.matcha.DEFAULT}  />
              </div>
            )}
          </>
        )}

        {/* Users */}
        {section === 'users' && (
          <>
            <h2 className="text-xl font-bold text-brew">Users</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {loading ? <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-12 bg-cream-deep rounded-xl animate-pulse" />)}</div>
              : <div className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brew">{u.name || 'Guest'}</p>
                        <p className="text-xs text-brew-soft">{u.email} · <span className="capitalize">{u.role}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-matcha/10 text-matcha' : 'bg-red-100 text-red-500'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                        <button onClick={() => toggleUser(u._id, u.isActive)}>
                          {u.isActive ? <ToggleRight size={20} color={COLORS.matcha.DEFAULT} /> : <ToggleLeft size={20} color={COLORS.brew.soft} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </>
        )}

        {/* Activity */}
        {section === 'activity' && (
          <>
            <h2 className="text-xl font-bold text-brew">Recent Activity</h2>
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
    api.get('/admin/activity').then((d) => setOrders(d.orders || [])).catch(() => {})
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-50 max-h-[60vh] overflow-auto">
        {orders.map((o) => (
          <div key={o._id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg">📦</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brew">Order #{o._id.slice(-6).toUpperCase()}</p>
              <p className="text-xs text-brew-soft">{o.customerId?.name || 'Guest'} · {new Date(o.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-brew text-sm">₹{o.total}</p>
              <p className="text-xs text-brew-soft capitalize">{o.status}</p>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="py-8 text-center text-brew-soft text-sm">No activity</div>}
      </div>
    </div>
  )
}

export default AdminDashboard