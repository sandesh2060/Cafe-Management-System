// src/modules/customer/components/callwaiter/CustomNoteInput.jsx
const MAX = 100

const CustomNoteInput = ({ value, onChange }) => (
  <div className="relative">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, MAX))}
      placeholder="Anything else? (optional)"
      rows={2}
      className="input-base resize-none text-sm pr-12"
      aria-label="Custom note for waiter"
    />
    <span
      className="absolute bottom-2.5 right-3 text-[10px] pointer-events-none"
      style={{ color: value.length >= MAX * 0.9 ? '#E05C2A' : '#aaa' }}
    >
      {value.length}/{MAX}
    </span>
  </div>
)

export default CustomNoteInput