import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, AlertTriangle, CheckCircle, Info, XCircle, ExternalLink } from 'lucide-react'
import axios from 'axios'

const SEVERITY_CONFIG = {
  error:   { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100'    },
  warning: { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
  success: { icon: CheckCircle,   color: 'text-emerald-500',bg: 'bg-emerald-50',border: 'border-emerald-100'},
  info:    { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
}

function timeAgo(dateUtc) {
  const diff = (Date.now() - new Date(dateUtc).getTime()) / 1000
  if (diff < 60)    return 'Baru saja'
  if (diff < 3600)  return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const token = localStorage.getItem('auth_token')
  const authHeader = React.useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token])

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await axios.get('/api/notifications', { headers: authHeader })
      setNotifications(res.data.data || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [token, authHeader])

  // Fetch on mount & every 3 minutes
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Also refresh when bell is opened
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id) => {
    try {
      await axios.post(`/api/notifications/${id}/read`, {}, { headers: authHeader })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) { void e }
  }

  const markAllRead = async () => {
    try {
      await axios.post('/api/notifications/read-all', {}, { headers: authHeader })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (e) { void e }
  }

  const deleteNotif = async (id, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`/api/notifications/${id}`, { headers: authHeader })
      const removed = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (removed && !removed.isRead) setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) { void err }
  }

  const clearAll = async () => {
    try {
      await axios.delete('/api/notifications/clear-all', { headers: authHeader })
      setNotifications([])
      setUnreadCount(0)
    } catch (e) { void e }
  }

  const handleClick = (notif) => {
    if (!notif.isRead) markRead(notif.id)
    if (notif.actionUrl) {
      setOpen(false)
      navigate(notif.actionUrl)
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200"
        aria-label="Notifikasi"
        id="notification-bell-btn"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="
          fixed inset-x-4 top-20 md:absolute md:inset-auto md:right-0 md:mt-2
          w-auto md:w-[380px] bg-white rounded-2xl border border-slate-200 
          shadow-2xl shadow-black/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-slate-600" />
              <span className="font-black text-sm text-slate-900 tracking-tight">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck size={13} />
                  Baca semua
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  title="Hapus semua"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mb-3" />
                <span className="text-xs font-medium">Memuat notifikasi...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Bell size={32} className="mb-3 opacity-30" />
                <span className="text-sm font-bold">Tidak ada notifikasi</span>
                <span className="text-xs mt-1 opacity-70">Semua aktivitas keuangan Anda aman</span>
              </div>
            ) : (
              notifications.map(notif => {
                const cfg = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`
                      group relative flex items-start gap-3 px-5 py-4 cursor-pointer transition-all duration-150
                      ${notif.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/60'}
                    `}
                  >
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}

                    {/* Icon */}
                    <div className={`mt-0.5 p-1.5 rounded-xl ${cfg.bg} shrink-0`}>
                      <Icon size={14} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold leading-tight ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                        {notif.title}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {timeAgo(notif.createdAtUtc)}
                        </span>
                        {notif.actionUrl && (
                          <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5">
                            <ExternalLink size={9} /> Lihat detail
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteNotif(notif.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150 mt-0.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-medium text-center">
                Menampilkan {notifications.length} notifikasi terbaru • Diperbarui otomatis
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
