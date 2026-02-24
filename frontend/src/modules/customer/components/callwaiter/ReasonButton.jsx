// src/modules/customer/components/callwaiter/ReasonButton.jsx
import { COLORS } from '@colors'

const ReasonButton = ({ reason, selected, onToggle }) => {
  const baseColor = reason.color || COLORS.saffron.DEFAULT

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
                 border-2 transition-all duration-150 active:scale-95 min-h-[40px]"
      style={selected
        ? { backgroundColor: baseColor, borderColor: baseColor, color: '#fff' }
        : { backgroundColor: 'transparent', borderColor: baseColor + '60', color: COLORS.brew.DEFAULT }
      }
      aria-pressed={selected}
    >
      <span>{reason.emoji}</span>
      <span>{reason.label}</span>
    </button>
  )
}

export default ReasonButton