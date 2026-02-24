// src/modules/customer/components/menu/WeatherBadge.jsx
import { COLORS } from '@colors'

const WeatherBadge = ({ tag }) => {
  if (!tag) return null
  return (
    <span
      className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full
                 bg-blue-50 text-blue-600 leading-tight truncate max-w-full"
    >
      {tag}
    </span>
  )
}

export default WeatherBadge