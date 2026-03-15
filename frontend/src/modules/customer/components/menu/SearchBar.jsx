// src/modules/customer/components/menu/SearchBar.jsx
//
// UPGRADES vs previous version:
// 1. Autocomplete suggestions — shows item names + categories as you type,
//    pulled from all menu items via selectAllItems selector.
//    Fuzzy-friendly: matches anywhere in name or category.
// 2. Suggestion dropdown appears below the input, disappears on select/blur/Esc.
// 3. No irregular behaviour — debounced input, suggestions only shown when
//    input has focus AND query length >= 1.
// 4. Keyboard navigation: ArrowDown/Up to move, Enter to select, Esc to close.
// 5. window.__searchOpen flag set while search is active — NotificationToast
//    and other overlays can check this to suppress themselves.

import { useRef, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Search, X } from "lucide-react";
import gsap from "gsap";
import { selectAllItems } from "@store/slices/menuSlice";

// Build suggestion list from all items — name + category
const buildSuggestions = (items, query) => {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const name = item.name ?? "";
    const cat  = item.category ?? "";
    if (
      (name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) &&
      !seen.has(name.toLowerCase())
    ) {
      seen.add(name.toLowerCase());
      results.push({ name, category: cat, emoji: item.emoji ?? "🍽️" });
      if (results.length >= 6) break;
    }
  }
  return results;
};

const SearchBar = ({ value, onChange, isDark: D }) => {
  const [open, setOpen]             = useState(false);
  const [focused, setFocused]       = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const [inputVal, setInputVal]     = useState(value ?? "");

  const allItems    = useSelector(selectAllItems);
  const wrapRef     = useRef(null);
  const inputRef    = useRef(null);
  const inputWrapRef = useRef(null);
  const dropRef     = useRef(null);
  const debounceRef = useRef(null);

  // ── Expand / collapse animation ──────────────────────────────────────────
  useEffect(() => {
    if (!inputWrapRef.current) return;
    if (open) {
      gsap.fromTo(
        inputWrapRef.current,
        { width: 0, opacity: 0 },
        { width: "auto", opacity: 1, duration: 0.28, ease: "power3.out" }
      );
      setTimeout(() => inputRef.current?.focus(), 40);
      window.__searchOpen = true;
    } else {
      gsap.to(inputWrapRef.current, {
        width: 0, opacity: 0, duration: 0.22, ease: "power2.in",
      });
      setSuggestions([]);
      setActiveIdx(-1);
      setInputVal("");
      onChange("");
      if (inputRef.current) inputRef.current.value = "";
      window.__searchOpen = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync suggestions when inputVal changes ───────────────────────────────
  useEffect(() => {
    if (!focused || !open) { setSuggestions([]); return; }
    const s = buildSuggestions(allItems, inputVal);
    setSuggestions(s);
    setActiveIdx(-1);
  }, [inputVal, focused, open, allItems]);

  // ── Suggestion dropdown entrance ─────────────────────────────────────────
  useEffect(() => {
    if (!dropRef.current) return;
    if (suggestions.length > 0) {
      gsap.fromTo(dropRef.current,
        { opacity: 0, y: -6, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" }
      );
    }
  }, [suggestions.length]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setInputVal(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 180);
  }, [onChange]);

  const handleSelect = useCallback((name) => {
    setInputVal(name);
    if (inputRef.current) inputRef.current.value = name;
    onChange(name);
    setSuggestions([]);
    setActiveIdx(-1);
    inputRef.current?.blur();
  }, [onChange]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setFocused(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!suggestions.length) {
      if (e.key === "Escape") handleClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx].name);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      handleClose();
    }
  }, [suggestions, activeIdx, handleSelect, handleClose]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Cleanup on unmount
  useEffect(() => () => {
    window.__searchOpen = false;
    clearTimeout(debounceRef.current);
  }, []);

  const showDropdown = focused && open && suggestions.length > 0;

  return (
    <div
      ref={wrapRef}
      className="flex items-center gap-1.5 will-change-transform relative"
      style={{ transformOrigin: "right center" }}
    >
      {/* Expandable input + dropdown wrapper */}
      <div
        ref={inputWrapRef}
        className="overflow-visible relative"
        style={{ width: 0, opacity: 0 }}
      >
        {/* Input */}
        <input
          ref={inputRef}
          type="search"
          value={inputVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so click on suggestion registers first
            setTimeout(() => setFocused(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search menu…"
          className="w-full pl-3 pr-3 py-2 text-sm rounded-xl outline-none
                     transition-colors duration-150 whitespace-nowrap"
          style={{
            background: "var(--bg-surface-2)",
            border: "1.5px solid var(--border-color)",
            color: "var(--text-primary)",
            caretColor: "var(--color-saffron)",
            minWidth: "160px",
          }}
          aria-label="Search menu"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Suggestions dropdown */}
        {showDropdown && (
          <div
            ref={dropRef}
            role="listbox"
            className="absolute left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-[9999]"
            style={{
              top: "100%",
              background: D ? "rgba(18,10,4,0.97)" : "rgba(255,253,248,0.99)",
              border: `1px solid ${D ? "rgba(255,159,28,0.18)" : "rgba(200,160,80,0.35)"}`,
              boxShadow: D
                ? "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,159,28,0.08)"
                : "0 16px 40px rgba(92,51,23,0.16), 0 0 0 1px rgba(240,217,181,0.5)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s.name}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s.name);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                           transition-colors duration-100 border-none cursor-pointer"
                style={{
                  background: i === activeIdx
                    ? D ? "rgba(255,159,28,0.12)" : "rgba(255,159,28,0.08)"
                    : "transparent",
                  borderBottom: i < suggestions.length - 1
                    ? `1px solid ${D ? "rgba(255,255,255,0.04)" : "rgba(92,51,23,0.06)"}`
                    : "none",
                }}
              >
                {/* Emoji */}
                <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
                  {s.emoji}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Highlight matching part */}
                  <HighlightMatch text={s.name} query={inputVal} isDark={D} />
                  <p className="m-0 text-[10px] mt-0.5 truncate"
                    style={{ color: D ? "rgba(196,154,108,0.55)" : "rgba(139,94,60,0.5)" }}>
                    {s.category.replace(/_/g, " ")}
                  </p>
                </div>

                {/* Search icon hint */}
                <Search size={11} style={{
                  color: i === activeIdx
                    ? "#FF9F1C"
                    : D ? "rgba(255,255,255,0.15)" : "rgba(92,51,23,0.2)",
                  flexShrink: 0,
                }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search toggle button */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                     [-webkit-tap-highlight-color:transparent]"
          style={{
            background: "var(--bg-surface-2)",
            border: "1.5px solid var(--border-color)",
          }}
          aria-label="Open search"
        >
          <Search size={15} style={{ color: "var(--text-muted)" }} />
        </button>
      ) : (
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                     [-webkit-tap-highlight-color:transparent] transition-colors duration-150"
          style={{
            background: "rgba(255,159,28,0.1)",
            border: "1.5px solid rgba(255,159,28,0.3)",
          }}
          aria-label="Close search"
        >
          <X size={14} style={{ color: "#FF9F1C" }} strokeWidth={2.5} />
        </button>
      )}

      <style>{`
        input[type=search]:focus {
          border-color: var(--color-saffron) !important;
          box-shadow: 0 0 0 3px rgba(255,159,28,0.15);
        }
        input[type=search]::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  );
};

// ── Highlight matching substring ──────────────────────────────────────────────
const HighlightMatch = ({ text, query, isDark }) => {
  if (!query) {
    return (
      <p className="m-0 text-[13px] font-semibold truncate"
        style={{ color: isDark ? "#FFF8EE" : "#1A0D00" }}>
        {text}
      </p>
    );
  }
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) {
    return (
      <p className="m-0 text-[13px] font-semibold truncate"
        style={{ color: isDark ? "#FFF8EE" : "#1A0D00" }}>
        {text}
      </p>
    );
  }
  return (
    <p className="m-0 text-[13px] font-semibold truncate"
      style={{ color: isDark ? "#FFF8EE" : "#1A0D00" }}>
      {text.slice(0, idx)}
      <mark style={{
        background: "rgba(255,159,28,0.28)",
        color: isDark ? "#FFB84D" : "#C8680A",
        borderRadius: 3,
        padding: "0 1px",
        fontWeight: 800,
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </p>
  );
};

export default SearchBar;