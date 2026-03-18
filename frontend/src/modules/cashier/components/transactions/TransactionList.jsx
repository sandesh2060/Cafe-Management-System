// src/modules/cashier/components/transactions/TransactionList.jsx
//
// ✅ Hardcoded hex in METHOD_META → var(--success/info/accent) tokens
// ✅ dk ? 'bg-gray-900' Tailwind → var(--card-bg/pill-bg/divider)
// ✅ text → var(--text-primary/muted/secondary)
// ✅ 'Rs' → BRAND.currency
// ✅ skeleton → .skeleton class from globals.css

import { useState, useEffect, useContext } from 'react'
import api from '@api/axios'
import { ThemeContext } from '@shared/context/ThemeContext'
import { BRAND } from '@shared/config/brand'
import { TrendingUp } from 'lucide-react'

const METHOD_META = {
  cash: { label: 'CASH', color: 'var(--success)', bg: 'var(--success-bg)' },
  card: { label: 'CARD', color: 'var(--info)',    bg: 'var(--info-bg)'    },
  upi:  { label: 'UPI',  color: 'var(--accent)',  bg: 'var(--accent-dim)' },
}

const TransactionList = () => {
  const { isDark } = useContext(ThemeContext)
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
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--divider)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} style={{ color: 'var(--success)' }} />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Today's Transactions</h2>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{summary.totalOrders} orders</p>
            <p className="font-black text-sm" style={{ color: 'var(--success)' }}>
              {BRAND.currency} {summary.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl skeleton" />)}
        </div>
      ) : txns.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions today</p>
        </div>
      ) : (
        <div className="divide-y max-h-64 overflow-auto" style={{ borderColor: 'var(--divider)' }}>
          {txns.map(t => {
            const m = METHOD_META[t.paymentMethod] || { label: '—', color: 'var(--text-muted)', bg: 'var(--pill-bg)' }
            return (
              <div
                key={t._id}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--pill-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: 'var(--pill-bg)', color: 'var(--text-secondary)' }}
                >
                  T{t.tableNumber || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Table #{t.tableNumber || '?'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(t.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: m.color, background: m.bg }}
                >
                  {m.label}
                </span>
                <p className="font-black text-sm flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {BRAND.currency} {t.total}
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