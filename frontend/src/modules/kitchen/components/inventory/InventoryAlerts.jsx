// src/modules/kitchen/components/inventory/InventoryAlerts.jsx
import { useState, useEffect } from 'react'
import api      from '@api/axios'
import { X, AlertTriangle } from 'lucide-react'

const InventoryAlerts = ({ onClose }) => {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/inventory/alerts').then((d) => setAlerts(d.alerts || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-4 mb-3 bg-red-950 border border-red-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="font-bold text-red-300 text-sm">Low Stock Alerts</p>
        </div>
        <button onClick={onClose}><X size={16} className="text-red-400" /></button>
      </div>
      {loading ? <p className="text-red-400 text-xs">Loading…</p> :
        alerts.length === 0 ? <p className="text-red-400 text-xs">All stock levels OK</p> :
        <div className="space-y-1">
          {alerts.map((a) => (
            <div key={a._id} className="flex justify-between text-xs">
              <span className="text-red-200">{a.name}</span>
              <span className="text-red-400 font-bold">{a.quantity} {a.unit} left (min {a.lowThreshold})</span>
            </div>
          ))}
        </div>
      }
    </div>
  )
}

export default InventoryAlerts