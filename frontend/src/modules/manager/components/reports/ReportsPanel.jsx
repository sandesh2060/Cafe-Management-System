// src/modules/manager/components/reports/ReportsPanel.jsx
import { useState, useEffect } from 'react'
import api from '@api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { COLORS } from '@colors'

const ReportsPanel = () => {
  const [daily,  setDaily]  = useState(null)
  const [staff,  setStaff]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/reports/daily'), api.get('/reports/staff?days=7')])
      .then(([d, s]) => { setDaily(d); setStaff(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4">{[1,2].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-brew">Reports</h2>

      {/* Today's daily summary */}
      {daily && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-brew text-sm">Today — {daily.date}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Orders',       value: daily.orders },
              { label: 'Revenue',      value: `₹${daily.revenue}` },
              { label: 'Avg Order',    value: `₹${daily.avgOrderValue}` },
              { label: 'Waiter Calls', value: daily.waiterCalls },
            ].map(({ label, value }) => (
              <div key={label} className="bg-cream-dark rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-brew">{value}</p>
                <p className="text-xs text-brew-soft">{label}</p>
              </div>
            ))}
          </div>
          {daily.avgResponseMinutes > 0 && (
            <p className="text-xs text-brew-soft">Avg waiter response: {daily.avgResponseMinutes} min</p>
          )}
        </div>
      )}

      {/* Waiter performance */}
      {staff && staff.waiters?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-brew text-sm mb-4">Waiter Performance (7d)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={staff.waiters}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="calls" fill={COLORS.saffron.DEFAULT} radius={[4,4,0,0]} name="Calls handled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ReportsPanel