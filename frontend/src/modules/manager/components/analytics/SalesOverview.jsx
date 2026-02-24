// src/modules/manager/components/analytics/SalesOverview.jsx
import { useState, useEffect } from 'react'
import api from '@api/axios'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { COLORS } from '@colors'
import { TrendingUp, ShoppingBag, DollarSign, Star } from 'lucide-react'

const DAYS_OPTIONS = [7, 14, 30]

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15' }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p className="text-2xl font-bold text-brew">{value}</p>
      <p className="text-xs text-brew-soft">{label}</p>
      {sub && <p className="text-xs text-matcha font-medium">{sub}</p>}
    </div>
  </div>
)

const PIE_COLORS = ['#FF9F1C', '#E05C2A', '#2D9B5A', '#1E6B4A', '#FFB84D', '#6B7280']

const SalesOverview = () => {
  const [data,   setData]   = useState(null)
  const [days,   setDays]   = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/reports/sales?days=${days}`).then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [days])

  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brew">Sales Overview</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {DAYS_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1 rounded-lg text-sm font-semibold transition-all"
              style={days === d ? { backgroundColor: COLORS.saffron.DEFAULT, color: '#fff' } : { color: COLORS.brew.soft }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={`₹${data?.summary?.totalRevenue?.toLocaleString()}`} color={COLORS.matcha.DEFAULT} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={data?.summary?.totalOrders} color={COLORS.saffron.DEFAULT} />
        <StatCard icon={TrendingUp} label="Avg Order Value" value={`₹${data?.summary?.avgOrder}`} color={COLORS.brew.DEFAULT} />
        <StatCard icon={Star} label="Period" value={`${days} days`} color={COLORS.terra.DEFAULT} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold text-brew text-sm mb-4">Daily Revenue</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.byDay || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke={COLORS.saffron.DEFAULT} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {data?.byCategory?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-brew text-sm mb-4">Revenue by Category</h3>
          <div className="flex gap-6">
            <ResponsiveContainer width="40%" height={160}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="revenue" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                  {data.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {data.byCategory.slice(0, 6).map((cat, i) => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-brew-soft capitalize">{cat.category.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="font-medium text-brew">₹{cat.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesOverview