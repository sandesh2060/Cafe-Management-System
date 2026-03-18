// src/modules/kitchen/components/inventory/InventoryAlerts.jsx
//
// ✅ bg-red-950, border-red-800, text-red-* Tailwind → var(--danger/danger-bg/danger-border)
// ✅ ThemeContext added for proper dark/light support
// ✅ Component now respects theme instead of always rendering red-on-dark

import { useState, useEffect } from 'react'
import api from '@api/axios'
import { X, AlertTriangle } from 'lucide-react'

const InventoryAlerts = ({ onClose }) => {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/inventory/alerts')
      .then(d => setAlerts(d.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-3 border"
      style={{
        background:   'var(--danger-bg)',
        borderColor:  'var(--danger-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--danger)' }}>
            Low Stock Alerts
          </p>
        </div>
        <button onClick={onClose}>
          <X size={16} style={{ color: 'var(--danger)' }} />
        </button>
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>Loading…</p>
      ) : alerts.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>All stock levels OK</p>
      ) : (
        <div className="space-y-1">
          {alerts.map(a => (
            <div key={a._id} className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-primary)' }}>{a.name}</span>
              <span className="font-bold" style={{ color: 'var(--danger)' }}>
                {a.quantity} {a.unit} left (min {a.lowThreshold})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InventoryAlerts