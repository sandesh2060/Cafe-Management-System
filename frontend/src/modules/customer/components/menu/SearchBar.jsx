// src/modules/customer/components/menu/SearchBar.jsx
import { useRef, useCallback, useEffect } from 'react'
import { Search, X }                      from 'lucide-react'
import gsap                               from 'gsap'

const SearchBar = ({ value, onChange }) => {
  const wrapRef     = useRef(null)
  const inputRef    = useRef(null)
  const clearRef    = useRef(null)
  const debounceRef = useRef(null)

  // Animate clear button in/out
  useEffect(() => {
    if (!clearRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    if (value) {
      gsap.to(clearRef.current, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(2)' })
    } else {
      gsap.to(clearRef.current, { scale: 0, opacity: 0, duration: 0.15, ease: 'power2.in' })
    }
  }, [value])

  const handleFocus = () => {
    if (!wrapRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.to(wrapRef.current, {
      scale: 1.012, duration: 0.25, ease: 'power2.out',
    })
  }
  const handleBlur = () => {
    if (!wrapRef.current) return
    gsap.to(wrapRef.current, { scale: 1, duration: 0.3, ease: 'elastic.out(1,0.6)' })
  }

  const handleChange = useCallback((e) => {
    const v = e.target.value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(v), 220)
  }, [onChange])

  const handleClear = () => {
    onChange('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative will-change-transform"
      style={{ transformOrigin: 'center' }}
    >
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-muted)' }}
      />

      <input
        ref={inputRef}
        type="search"
        defaultValue={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search menu…"
        className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl outline-none
                   transition-colors duration-150"
        style={{
          background:   'var(--bg-surface-2)',
          border:       '1.5px solid var(--border-color)',
          color:        'var(--text-primary)',
          caretColor:   'var(--color-saffron)',
        }}
        onKeyDown={(e) => e.key === 'Escape' && handleClear()}
        aria-label="Search menu"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Clear */}
      <button
        ref={clearRef}
        onClick={handleClear}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5
                   rounded-full flex items-center justify-center opacity-0 scale-0"
        style={{ background: 'var(--text-muted)', minWidth: 'unset', minHeight: 'unset' }}
        aria-label="Clear search"
        tabIndex={value ? 0 : -1}
      >
        <X size={10} color="#fff" strokeWidth={3} />
      </button>

      {/* Focus ring — saffron */}
      <style>{`
        input[type=search]:focus {
          border-color: var(--color-saffron) !important;
          box-shadow: 0 0 0 3px rgba(255,159,28,0.15);
        }
        input[type=search]::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  )
}

export default SearchBar