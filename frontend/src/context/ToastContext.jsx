import React, { createContext, useCallback, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let toastIdCounter = 0

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
}

const COLORS = {
  success: 'border-emerald-200 bg-emerald-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-blue-200 bg-blue-50',
}

const TEXT_COLORS = {
  success: 'text-emerald-800',
  error: 'text-red-800',
  warning: 'text-amber-800',
  info: 'text-blue-800',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: '380px', width: '100%' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl shadow-black/5
              backdrop-blur-sm animate-in slide-in-from-right-8 fade-in duration-300
              ${COLORS[t.type] || COLORS.info}
            `}
          >
            <div className="mt-0.5">{ICONS[t.type] || ICONS.info}</div>
            <div className="flex-1 min-w-0">
              {t.title && (
                <div className={`text-sm font-bold leading-tight ${TEXT_COLORS[t.type] || TEXT_COLORS.info}`}>
                  {t.title}
                </div>
              )}
              {t.message && (
                <div className={`text-xs font-medium mt-0.5 leading-relaxed ${TEXT_COLORS[t.type] || TEXT_COLORS.info} opacity-80`}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
