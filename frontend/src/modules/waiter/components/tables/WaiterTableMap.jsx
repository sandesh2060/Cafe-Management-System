// src/modules/waiter/components/tables/WaiterTableMap.jsx
import { useState, useEffect } from 'react'
import api           from '@api/axios'
import { COLORS }    from '@colors'
import { Map }       from 'lucide-react'

const ZONE_COLOR = {
  Indoor:  COLORS.brew.DEFAULT,
  Outdoor: COLORS.matcha.DEFAULT,
  Terrace: COLORS.saffron.DEFAULT,
}

const WaiterTableMap = () => {
  const [tables,  setTables]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tables').then((d) => setTables(d.tables || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const zones = ['Indoor', 'Outdoor', 'Terrace']

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Map size={18} color={COLORS.brew.light} />
        <h2 className="font-bold text-brew text-base">Tables</h2>
      </div>

      {loading ? (
        <div className="p-4 grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-cream-deep rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {zones.map((zone) => {
            const zoneTables = tables.filter((t) => t.zone === zone)
            if (!zoneTables.length) return null
            return (
              <div key={zone}>
                <p className="text-xs font-bold mb-1.5" style={{ color: ZONE_COLOR[zone] }}>{zone}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {zoneTables.map((t) => (
                    <div
                      key={t._id}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center
                                 text-xs font-bold text-white"
                      style={{ backgroundColor: ZONE_COLOR[zone] + 'cc' }}
                    >
                      <span>{t.tableNumber}</span>
                      <span className="text-[8px] font-normal opacity-80">{t.capacity}p</span>
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