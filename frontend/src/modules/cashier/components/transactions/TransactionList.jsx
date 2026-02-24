// src/modules/cashier/components/transactions/TransactionList.jsx
import { useState, useEffect } from 'react'
import api from '@api/axios'

const TransactionList = () => {
  const [txns,    setTxns]    = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0 })

  useEffect(() => {
    api.get('/billing/transactions').then((d) => {
      setTxns(d.orders || [])
      setSummary({ totalRevenue: d.totalRevenue || 0, totalOrders: d.totalOrders || 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-brew text-base">Today's Transactions</h2>
        <div className="text-right">
          <p className="text-xs text-brew-soft">{summary.totalOrders} orders</p>
          <p className="font-bold text-matcha text-sm">₹{summary.totalRevenue}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-12 bg-cream-deep rounded-lg animate-pulse" />)}
        </div>
      ) : txns.length === 0 ? (
        <div className="py-8 text-center text-brew-soft text-sm">No transactions today</div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-64 overflow-auto">
          {txns.map((t) => (
            <div key={t._id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-semibold text-brew">Table #{t.tableNumber || '?'}</p>
                <p className="text-xs text-brew-soft">
                  {new Date(t.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{t.paymentMethod?.toUpperCase()}
                </p>
              </div>
              <p className="font-bold text-brew">₹{t.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TransactionList