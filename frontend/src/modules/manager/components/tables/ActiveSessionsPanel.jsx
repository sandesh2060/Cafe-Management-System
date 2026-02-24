// src/modules/manager/components/tables/ActiveSessionsPanel.jsx
import { useState, useEffect } from 'react'
import api        from '@api/axios'
import { COLORS } from '@colors'
import { Map }    from 'lucide-react'

const ActiveSessionsPanel = () => {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/table-session/active').then((d) => setSessions(d.sessions || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-brew">Active Sessions ({sessions.length})</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 bg-cream-deep rounded-xl animate-pulse" />)}</div>
        : sessions.length === 0 ? <div className="py-10 text-center text-brew-soft text-sm">No active sessions</div>
        : <div className="divide-y divide-gray-50">
            {sessions.map((s) => (
              <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center text-sm font-bold text-saffron flex-shrink-0">
                  T{s.tableNumber || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brew">{s.zone || 'Indoor'}</p>
                  <p className="text-xs text-brew-soft">
                    {s.users?.length || 1} guest · {s.detectionMethod?.toUpperCase()}
                    {' · '}{new Date(s.openedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <span className="text-xs font-bold text-matcha">Active</span>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}

export default ActiveSessionsPanel