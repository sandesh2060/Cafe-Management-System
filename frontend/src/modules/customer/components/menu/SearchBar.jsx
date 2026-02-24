// src/modules/customer/components/menu/SearchBar.jsx
import { useRef }    from 'react'
import { Search, X } from 'lucide-react'
import { COLORS }    from '@colors'

const SearchBar = ({ value, onChange }) => {
  const debounceRef = useRef(null)

  const handleChange = (e) => {
    const v = e.target.value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(v), 250)
  }

  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="search"
        defaultValue={value}
        onChange={handleChange}
        placeholder="Search menu…"
        className="input-base pl-10 pr-9 py-2.5 text-sm"
        aria-label="Search menu"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                     bg-gray-200 flex items-center justify-center"
          aria-label="Clear search"
        >
          <X size={11} color={COLORS.brew.soft} />
        </button>
      )}
    </div>
  )
}

export default SearchBar