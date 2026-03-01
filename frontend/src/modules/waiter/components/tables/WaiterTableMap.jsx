// src/modules/waiter/components/tables/WaiterTableMap.jsx
import { useState, useEffect, useContext } from 'react'
import api              from '@api/axios'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { Map }           from 'lucide-react'

const ZONE_META = {
  Indoor:  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  Outdoor: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  Terrace: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  Bar:     { color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
}
const DEFAULT_ZONE = { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' }

const WaiterTableMap = () => {
  const [tables, setTables]   = useState([])
  const [loading, setLoading] = useState(true)
  const { isDark: dk }        = useContext(ThemeContext)

  useEffect(() => {
    api.get('/tables')
      .then(d => setTables(d.tables || d.data?.tables || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const zones = [...new Set(tables.map(t => t.zone).filter(Boolean))]
  if (!zones.length && tables.length) zones.push('All')

  return (
    <div className={`rounded-2xl border overflow-hidden
      ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

      <div className={`flex items-center gap-2 px-4 py-3 border-b
        ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
        <Map size={17} className={dk ? 'text-purple-400' : 'text-purple-500'} />
        <h2 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>Tables</h2>
        <span className={`text-xs ml-auto ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
          {tables.length} total
        </span>
      </div>

      {loading ? (
        <div className="p-4 grid grid-cols-5 gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`aspect-square rounded-xl animate-pulse
              ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : (
        <div className="p-3 space-y-4">
          {zones.map(zone => {
            const zoneTables = zone === 'All' ? tables : tables.filter(t => t.zone === zone)
            const meta = ZONE_META[zone] || DEFAULT_ZONE
            return (
              <div key={zone}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <p className="text-xs font-bold uppercase tracking-wider"
                     style={{ color: meta.color }}>
                    {zone}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                    ${dk ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {zoneTables.length}
                  </span>
                </div>
                <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {zoneTables.map((t, i) => (
                    <div
                      key={t._id}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center
                                 text-xs font-bold cursor-default transition-transform hover:scale-110"
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        border: `1.5px solid ${meta.color}44`,
                        animationDelay: `${i * 30}ms`,
                      }}
                    >
                      <span className="text-xs font-black">{t.tableNumber}</span>
                      <span className="text-[8px] opacity-70">{t.capacity}p</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WaiterTableMap