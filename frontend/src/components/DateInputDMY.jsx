import React, { useEffect, useMemo, useState } from 'react'

function isValidIsoDate(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Replaces non-digits and formats automatically
function formatInput(text, format) {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length === 0) return ''
  
  if (format === 'YMD') {
    // YYYYMMDD -> YYYY/MM/DD
    if (digits.length <= 4) return digits
    if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`
  }
  
  // DMY or MDY -> DD/MM/YYYY or MM/DD/YYYY
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function isoToDisplay(iso, format) {
  if (!isValidIsoDate(iso)) return ''
  const [y, m, d] = iso.split('-')
  if (format === 'YMD') return `${y}/${m}/${d}`
  if (format === 'MDY') return `${m}/${d}/${y}`
  return `${d}/${m}/${y}`
}

function displayToIso(display, format) {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return null
  
  let yyyy, mm, dd
  if (format === 'YMD') {
    yyyy = Number(digits.slice(0, 4))
    mm = Number(digits.slice(4, 6))
    dd = Number(digits.slice(6, 8))
  } else if (format === 'MDY') {
    mm = Number(digits.slice(0, 2))
    dd = Number(digits.slice(2, 4))
    yyyy = Number(digits.slice(4, 8))
  } else {
    dd = Number(digits.slice(0, 2))
    mm = Number(digits.slice(2, 4))
    yyyy = Number(digits.slice(4, 8))
  }
  
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null
  const dt = new Date(yyyy, mm - 1, dd)
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null
  
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
}

export default function DateInputDMY({
  value,
  onChange,
  className = '',
  disabled = false,
}) {
  const dateFormat = localStorage.getItem('prefs_dateFormat') || 'DMY'
  
  // Dynamic placeholder
  const placeholder = dateFormat === 'YMD' ? 'YYYY/MM/DD' : (dateFormat === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY')
  
  const display = useMemo(() => isoToDisplay(value, dateFormat), [value, dateFormat])
  const [text, setText] = useState(display)

  useEffect(() => {
    setText(display)
  }, [display])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        // Auto format while typing
        const next = formatInput(e.target.value, dateFormat)
        setText(next)
        
        // Attempt to parse into ISO
        const iso = displayToIso(next, dateFormat)
        if (iso && iso !== value) {
          onChange?.(iso)
        } else if (!next) {
          // Allow clearing the value
          onChange?.('')
        }
      }}
      onBlur={() => {
        const iso = displayToIso(text, dateFormat)
        if (!iso && text !== '') {
          setText(display) // Rollback if invalid
        }
      }}
      className={className}
    />
  )
}

