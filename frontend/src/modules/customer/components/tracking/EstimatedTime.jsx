// src/modules/customer/components/tracking/EstimatedTime.jsx
import { useEffect, useState } from 'react'
import { Clock }               from 'lucide-react'
import { COLORS }              from '@colors'

// Rough ETA in minutes from each status
const ETA_MAP = {
  pending:    '15–20 min',
  preparing:  '10–15 min',
  on_the_way: '2–5 min',
  delivered:  null,
  paid:       null,
}

const ElapsedTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [startTime])

  return (
    <span className="text-brew-soft text-xs">
      Ordered {elapsed === 0 ? 'just now' : `${elapsed} min ago`}
    </span>
  )
}

const EstimatedTime = ({ status, placedAt }) => {
  const eta = ETA_MAP[status]

  if (!eta) return null

  return (
    <div
      className="card flex items-center justify-between py-3"
      style={{ borderColor: COLORS.saffron.DEFAULT + '30', backgroundColor: COLORS.saffron.DEFAULT + '08' }}
    >
      <div className="flex items-center gap-2">
        <Clock size={18} color={COLORS.saffron.DEFAULT} />
        <div>
          <p className="text-sm font-bold text-brew">
            Est. {eta}
          </p>
          {placedAt && <ElapsedTimer startTime={placedAt} />}
        </div>
      </div>
      <div
        className="px-3 py-1 rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: COLORS.saffron.DEFAULT }}
      >
        {status === 'pending' ? 'Confirmed' : status === 'preparing' ? 'Cooking' : 'Coming!'}
      </div>
    </div>
  )
}

export default EstimatedTime