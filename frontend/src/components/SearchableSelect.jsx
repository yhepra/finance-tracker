import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih',
  emptyLabel,
  disabled = false,
  className = '',
  menuClassName = '',
  searchThreshold = 0,
}) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' })

  const normalizedOptions = useMemo(() => {
    const list = Array.isArray(options) ? options : []
    const items = list
      .map((o) => ({
        value: o?.value,
        label: String(o?.label ?? ''),
        disabled: Boolean(o?.disabled),
      }))
      .filter((o) => o.label.length > 0)
    if (typeof emptyLabel === 'string') {
      return [{ value: '', label: emptyLabel, disabled: false }, ...items]
    }
    return items
  }, [options, emptyLabel])

  const showSearch = searchThreshold <= 0 || normalizedOptions.length >= searchThreshold

  const filtered = useMemo(() => {
    if (!showSearch) return normalizedOptions
    const q = query.trim().toLowerCase()
    if (!q) return normalizedOptions
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [normalizedOptions, query, showSearch])

  const selectedLabel = useMemo(() => {
    const found = normalizedOptions.find((o) => Object.is(o.value, value))
    if (found) return found.label
    if (value === '' && typeof emptyLabel === 'string') return emptyLabel
    return ''
  }, [normalizedOptions, value, emptyLabel])

  useEffect(() => {
    if (!open) return
    if (showSearch) {
      setTimeout(() => {
        searchRef.current?.focus?.()
      }, 0)
    }
  }, [open, showSearch])

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return
      if (rootRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
      setQuery('')
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const computePos = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 8, left: rect.left, width: rect.width, placement: 'bottom' })
  }

  const openMenu = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    const index = normalizedOptions.findIndex((o) => Object.is(o.value, value))
    setActiveIndex(index >= 0 ? index : 0)
    computePos()
  }

  useEffect(() => {
    if (!open) return
    computePos()
    const onReflow = () => computePos()
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const el = triggerRef.current
    const menu = menuRef.current
    if (!el || !menu) return
    const rect = el.getBoundingClientRect()
    const mh = menu.offsetHeight || 0
    const fitsBottom = rect.bottom + 8 + mh <= window.innerHeight
    const fitsTop = rect.top - 8 - mh >= 0
    if (!fitsBottom && fitsTop) {
      setMenuPos({ top: rect.top - 8, left: rect.left, width: rect.width, placement: 'top' })
    }
  }, [open, query, filtered.length])

  const selectValue = (nextValue) => {
    const item = normalizedOptions.find((o) => Object.is(o.value, nextValue))
    if (item?.disabled) return
    onChange?.(nextValue)
    closeMenu()
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item && !item.disabled) selectValue(item.value)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        className={`w-full inline-flex items-center justify-between gap-2 ${className} ${
          disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selectedLabel ? '' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} className={`${open ? 'rotate-180' : ''} transition-transform`} />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                left: `${menuPos.left}px`,
                width: `${menuPos.width}px`,
                top: menuPos.placement === 'bottom' ? `${menuPos.top}px` : undefined,
                bottom: menuPos.placement === 'top' ? `${window.innerHeight - menuPos.top}px` : undefined,
              }}
              className={`z-[100] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden ${menuClassName}`}
            >
              {showSearch ? (
                <div className="p-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setActiveIndex(0)
                      }}
                      onKeyDown={onKeyDown}
                      className="w-full min-w-0 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                      placeholder="Cari..."
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              ) : null}

              <div className="max-h-64 overflow-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">Tidak ada hasil.</div>
                ) : (
                  filtered.map((o, idx) => {
                    const isSelected = Object.is(o.value, value)
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={`${String(o.value)}-${o.label}-${idx}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => (o.disabled ? null : selectValue(o.value))}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          isActive ? 'bg-slate-50' : ''
                        } ${o.disabled ? 'text-slate-400 cursor-not-allowed' : isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'} ${o.disabled ? '' : 'hover:bg-slate-50'}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={o.disabled}
                        disabled={o.disabled}
                      >
                        {o.label}
                      </button>
                    )
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
