// src/modules/cashier/components/transactions/TransactionList.jsx
import { useState, useEffect, useContext } from 'react'
import api              from '@api/axios'
import { ThemeContext } from '@shared/context/ThemeContext'
import { TrendingUp }   from 'lucide-react'

const METHOD_META = {
  cash: { label: 'CASH', color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  card: { label: 'CARD', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  upi:  { label: 'UPI',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
}

const TransactionList = () => {
  const { isDark: dk } = useContext(ThemeContext)
  const [txns,    setTxns]    = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0 })

  useEffect(() => {
    api.get('/billing/transactions')
      .then(d => {
        const data = d.data ?? d
        setTxns(data.orders || [])
        setSummary({ totalRevenue: data.totalRevenue || 0, totalOrders: data.totalOrders || 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={`rounded-2xl border overflow-hidden
      ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

      {/* Header + summary */}
      <div className={`px-4 py-3 border-b ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className={dk ? 'text-emerald-400' : 'text-emerald-600'} />
            <h2 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>
              Today's Transactions
            </h2>
          </div>
          <div className="text-right">
            <p className={`text-xs ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
              {summary.totalOrders} orders
            </p>
            <p className="font-black text-sm text-emerald-500">
              ₹{summary.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className={`h-12 rounded-xl animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : txns.length === 0 ? (
        <div className="py-8 text-center">
          <p className={`text-sm ${dk ? 'text-gray-600' : 'text-gray-400'}`}>No transactions today</p>
        </div>
      ) : (
        <div className="divide-y max-h-64 overflow-auto"
             style={{ borderColor: dk ? 'rgba(255,255,255,0.05)' : '#f9fafb' }}>
          {txns.map(t => {
            const m = METHOD_META[t.paymentMethod] || { label: '—', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' }
            return (
              <div key={t._id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors
                ${dk ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0
                  ${dk ? 'bg-white/8 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  T{t.tableNumber || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
                    Table #{t.tableNumber || '?'}
                  </p>
                  <p className={`text-xs ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(t.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: m.color, background: m.bg }}>
                  {m.label}
                </span>
                <p className={`font-black text-sm flex-shrink-0 ${dk ? 'text-white' : 'text-gray-900'}`}>
                  ₹{t.total}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TransactionList