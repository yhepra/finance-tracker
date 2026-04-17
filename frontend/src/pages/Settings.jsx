import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  User, 
  Settings as SettingsIcon, 
  Book, 
  Library, 
  LayoutGrid, 
  Share2, 
  Mail, 
  Info,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import SearchableSelect from '../components/SearchableSelect'
import DateInputDMY from '../components/DateInputDMY'
import { t } from '../i18n'

const TRANSACTION_TYPES = [
  { value: 1, label: 'Pemasukan' },
  { value: 2, label: 'Pengeluaran' },
  { value: 3, label: 'Transfer Internal' },
  { value: 4, label: 'Bayar Hutang' },
]

function normalizeSettingsTab(tab) {
  const next = String(tab || '')
    .trim()
    .toLowerCase()
  const allowed = new Set(['account', 'general', 'directory', 'categories', 'banks', 'integrations', 'about', 'smtp'])
  if (next && allowed.has(next)) return next
  return ''
}

function Modal({ open, title, children, onClose, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300`}>
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xl font-black text-slate-900 tracking-tight">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const params = useParams()
  const [role] = useState(() => localStorage.getItem('auth_role') || 'User')
  const [tab, setTab] = useState(() => normalizeSettingsTab(params.tab) || 'account')
  const isAdmin = role === 'Admin'
  const [menuQuery, setMenuQuery] = useState('')
  const [, setI18nTick] = useState(0)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isAddBankOpen, setIsAddBankOpen] = useState(false)
  const [isGeminiKeyOpen, setIsGeminiKeyOpen] = useState(false)
  const [isTestGeminiOpen, setIsTestGeminiOpen] = useState(false)
  const [isGeminiHelpOpen, setIsGeminiHelpOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmConfirmLabel, setConfirmConfirmLabel] = useState('Hapus')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState(2)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState(2)

  const [banks, setBanks] = useState([])
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [bankError, setBankError] = useState('')
  const [newBankCode, setNewBankCode] = useState('')
  const [newBankName, setNewBankName] = useState('')
  const [newBankActive, setNewBankActive] = useState(true)
  const [editingBankId, setEditingBankId] = useState(null)
  const [editBankName, setEditBankName] = useState('')

  const [geminiConfigured, setGeminiConfigured] = useState(false)
  const [geminiSuffix, setGeminiSuffix] = useState('')
  const [geminiLoading, setGeminiLoading] = useState(true)
  const [geminiError, setGeminiError] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [_geminiShowKey, setGeminiShowKey] = useState(false)
  const [geminiTestLoading, setGeminiTestLoading] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState('')

  const [accountEmail, setAccountEmail] = useState(localStorage.getItem('auth_email') || '')
  const [accountName, setAccountName] = useState(localStorage.getItem('auth_name') || '')
  const [accountDob, setAccountDob] = useState(localStorage.getItem('auth_dob') || '')
  const [profileName, setProfileName] = useState(localStorage.getItem('auth_name') || '')
  const [profileDob, setProfileDob] = useState(localStorage.getItem('auth_dob') || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  const [generalLoading, setGeneralLoading] = useState(true)
  const [generalError, setGeneralError] = useState('')
  const [generalLanguage, setGeneralLanguage] = useState(localStorage.getItem('prefs_language') || 'id')
  const [generalDateFormat, setGeneralDateFormat] = useState(localStorage.getItem('prefs_dateFormat') || 'DMY')
  const [generalNumberLocale, setGeneralNumberLocale] = useState(localStorage.getItem('prefs_numberLocale') || 'id-ID')
  const [generalDefaultBankId, setGeneralDefaultBankId] = useState(localStorage.getItem('prefs_defaultBankId') || '')

  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpError, setSmtpError] = useState('')
  const [smtpSuccess, setSmtpSuccess] = useState('')
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp-relay.brevo.com',
    port: 587,
    username: '',
    password: '',
    senderEmail: '',
    senderName: '',
    adminEmail: ''
  })
  const [smtpTestLoading, setSmtpTestLoading] = useState(false)

  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState('')
  const [cpSuccess, setCpSuccess] = useState('')
  const [cpData, setCpData] = useState({ oldPassword: '', newPassword: '' })

  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState('')
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [directoryPage, setDirectoryPage] = useState(1)
  const [directoryPageSize, setDirectoryPageSize] = useState(20)
  const [directoryTotal, setDirectoryTotal] = useState(0)
  const [directoryItems, setDirectoryItems] = useState([])
  const [editingTermId, setEditingTermId] = useState(null)
  const [editTermKey, setEditTermKey] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 4000)
  }, [])
  const [editTermIdText, setEditTermIdText] = useState('')
  const [editTermEnText, setEditTermEnText] = useState('')

  const typeLabel = useMemo(() => {
    return TRANSACTION_TYPES.reduce((acc, x) => {
      acc[String(x.value)] = x.label
      return acc
    }, {})
  }, [])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await axios.get('/api/categories')
      setCategories(res.data?.data || [])
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal memuat (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  const loadBanks = useCallback(async () => {
    setBankError('')
    setLoadingBanks(true)
    try {
      const res = await axios.get('/api/banks')
      setBanks(res.data?.data || [])
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal memuat bank (HTTP ${status}).`
        : 'Tidak bisa menghubungi server.'
      setBankError(message)
    } finally {
      setLoadingBanks(false)
    }
  }, [navigate])

  useEffect(() => {
    loadBanks()
  }, [loadBanks])

  useEffect(() => {
    const rerender = () => setI18nTick((x) => x + 1)
    window.addEventListener('i18n-updated', rerender)
    window.addEventListener('prefs-updated', rerender)
    return () => {
      window.removeEventListener('i18n-updated', rerender)
      window.removeEventListener('prefs-updated', rerender)
    }
  }, [])

  const loadGemini = useCallback(async () => {
    setGeminiError('')
    setGeminiLoading(true)
    try {
      const res = await axios.get('/api/integrations/gemini')
      setGeminiConfigured(Boolean(res.data?.configured))
      setGeminiSuffix(res.data?.suffix || '')
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal memuat integrasi (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setGeminiError(message)
    } finally {
      setGeminiLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadGemini()
  }, [loadGemini])

  useEffect(() => {
    const next = normalizeSettingsTab(params.tab)
    setTab(next || 'account')
  }, [params.tab])

  useEffect(() => {
    const anchor = window.location.hash ? window.location.hash.slice(1) : ''
    if (!anchor) return
    const el = document.getElementById(anchor)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab])

  const loadMe = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me')
      setAccountEmail(res.data?.email || '')
      setAccountName(res.data?.name || '')
      setAccountDob(res.data?.dateOfBirth || '')
      if (typeof res.data?.email === 'string') localStorage.setItem('auth_email', res.data.email)
      if (typeof res.data?.name === 'string') localStorage.setItem('auth_name', res.data.name)
      localStorage.setItem('auth_dob', res.data?.dateOfBirth || '')
      window.dispatchEvent(new Event('auth-updated'))
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        localStorage.removeItem('auth_dob')
        navigate('/login', { replace: true })
      }
    }
  }, [navigate])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    setProfileName(accountName || '')
    setProfileDob(accountDob || '')
  }, [accountDob, accountName])

  const loadGeneral = useCallback(async () => {
    setGeneralError('')
    setGeneralLoading(true)
    try {
      const res = await axios.get('/api/settings/general')
      const lang = res.data?.language || 'id'
      const df = res.data?.dateFormat || 'DMY'
      const nl = res.data?.numberLocale || 'id-ID'
      const db = res.data?.defaultBankId != null ? String(res.data.defaultBankId) : ''
      setGeneralLanguage(lang)
      setGeneralDateFormat(df)
      setGeneralNumberLocale(nl)
      setGeneralDefaultBankId(db)
      localStorage.setItem('prefs_language', lang)
      localStorage.setItem('prefs_dateFormat', df)
      localStorage.setItem('prefs_numberLocale', nl)
      if (db) localStorage.setItem('prefs_defaultBankId', db)
      else localStorage.removeItem('prefs_defaultBankId')
      window.dispatchEvent(new Event('prefs-updated'))
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        localStorage.removeItem('auth_dob')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal memuat setting (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan (default: http://localhost:5116).'
      setGeneralError(message)
    } finally {
      setGeneralLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadGeneral()
  }, [loadGeneral])

  const loadSmtp = useCallback(async () => {
    setSmtpError('')
    setSmtpLoading(true)
    try {
      const res = await axios.get('/api/settings/smtp')
      setSmtpConfig(res.data || {
        host: 'smtp-relay.brevo.com',
        port: 587,
        username: '',
        password: '',
        senderEmail: '',
        senderName: '',
        adminEmail: ''
      })
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        navigate('/login', { replace: true })
        return
      }
      setSmtpError('Gagal memuat pengaturan SMTP.')
    } finally {
      setSmtpLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (tab === 'smtp') {
      loadSmtp()
    }
  }, [tab, loadSmtp])

  const saveSmtp = async (e) => {
    e.preventDefault()
    setSmtpError('')
    setSmtpSuccess('')
    setSmtpLoading(true)
    try {
      await axios.put('/api/settings/smtp', smtpConfig)
      setSmtpSuccess('Pengaturan SMTP berhasil disimpan.')
    } catch {
      setSmtpError('Gagal menyimpan pengaturan SMTP.')
    } finally {
      setSmtpLoading(false)
    }
  }

  const testSmtp = async () => {
    setSmtpError('')
    setSmtpSuccess('')
    setSmtpTestLoading(true)
    try {
      const res = await axios.post('/api/settings/smtp/test')
      setSmtpSuccess(res.data.message || 'Koneksi SMTP berhasil di test.')
    } catch (err) {
      setSmtpError(err?.response?.data?.message || 'Gagal koneksi SMTP.')
    } finally {
      setSmtpTestLoading(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setCpError('')
    setCpSuccess('')
    setCpLoading(true)
    try {
      const res = await axios.post('/api/auth/change-password', cpData)
      setCpSuccess(res.data.message || 'Password berhasil diubah.')
      setCpData({ oldPassword: '', newPassword: '' })
    } catch (err) {
      setCpError(err?.response?.data?.message || 'Gagal mengubah password.')
    } finally {
      setCpLoading(false)
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      const res = await axios.put('/api/auth/profile', {
        fullName: profileName,
        dateOfBirth: profileDob || null,
      })
      if (res?.data?.token) localStorage.setItem('auth_token', res.data.token)
      if (typeof res?.data?.email === 'string') localStorage.setItem('auth_email', res.data.email)
      localStorage.setItem('auth_name', res.data.name || '')
      localStorage.setItem('auth_dob', res.data.dateOfBirth || '')
      window.dispatchEvent(new Event('auth-updated'))
      setProfileSuccess('Profil berhasil disimpan.')
      loadMe()
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        localStorage.removeItem('auth_dob')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setProfileError(message)
    } finally {
      setProfileLoading(false)
    }
  }

  const addCategory = async (e) => {
    e.preventDefault()
    setError('')
    const name = newName.trim()
    if (!name) {
      setError('Nama kategori wajib diisi.')
      return
    }
    try {
      const res = await axios.post('/api/categories', { name, type: Number(newType) })
      setCategories((prev) => [...prev, res.data.data])
      setNewName('')
      setNewType(2)
      setIsAddCategoryOpen(false)
      showNotification(`Berhasil! Kategori "${name}" telah ditambahkan.`)
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menambah (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
      showNotification(`Gagal: ${message}`, 'error')
    }
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditType(Number(c.type))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditType(2)
  }

  const saveEdit = async (id) => {
    setError('')
    const name = editName.trim()
    if (!name) {
      setError('Nama kategori wajib diisi.')
      return
    }
    try {
      const res = await axios.put(`/api/categories/${id}`, { name, type: Number(editType) })
      const updated = res.data.data
      setCategories((prev) => prev.map((x) => (x.id === id ? updated : x)))
      cancelEdit()
      showNotification('Kategori berhasil diperbarui.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
      showNotification(`Gagal menyimpan: ${message}`, 'error')
    }
  }

  const deleteCategory = async (id) => {
    setError('')
    setConfirmTitle('Hapus Kategori')
    setConfirmMessage('Hapus kategori ini? Tindakan ini tidak bisa dibatalkan.')
    setConfirmConfirmLabel('Hapus')
    setConfirmAction(() => async () => {
      try {
        await axios.delete(`/api/categories/${id}`)
        setCategories((prev) => prev.filter((x) => x.id !== id))
        showNotification('Kategori berhasil dihapus.')
      } catch (err) {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.title
        const status = err?.response?.status
        const message = err?.response ? apiMessage || `Gagal menghapus (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
        setError(message)
        showNotification(`Gagal menghapus: ${message}`, 'error')
        throw err
      }
    })
    setIsConfirmOpen(true)
  }

  const addBank = async (e) => {
    e.preventDefault()
    setBankError('')
    const code = newBankCode.trim().toUpperCase()
    const name = newBankName.trim()
    if (!code) {
      setBankError('Kode bank wajib diisi.')
      return
    }
    if (!name) {
      setBankError('Nama bank wajib diisi.')
      return
    }
    try {
      const res = await axios.post('/api/banks', { code, name, isActive: Boolean(newBankActive) })
      setBanks((prev) => [res.data.data, ...prev])
      setNewBankCode('')
      setNewBankName('')
      setNewBankActive(true)
      setIsAddBankOpen(false)
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menambah (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setBankError(message)
    }
  }

  const startEditBank = (b) => {
    setEditingBankId(b.id)
    setEditBankName(b.name || '')
  }

  const cancelEditBank = () => {
    setEditingBankId(null)
    setEditBankName('')
  }

  const saveEditBank = async (id) => {
    setBankError('')
    const name = editBankName.trim()
    if (!name) {
      setBankError('Nama bank wajib diisi.')
      return
    }
    try {
      const res = await axios.put(`/api/banks/${id}`, { name })
      const updated = res.data.data
      setBanks((prev) => prev.map((x) => (x.id === id ? updated : x)))
      cancelEditBank()
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setBankError(message)
    }
  }

  const toggleBankActive = async (b) => {
    setBankError('')
    try {
      const res = await axios.put(`/api/banks/${b.id}`, { isActive: !b.isActive })
      const updated = res.data.data
      setBanks((prev) => prev.map((x) => (x.id === b.id ? updated : x)))
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setBankError(message)
    }
  }

  const deleteBank = async (id) => {
    setBankError('')
    setConfirmTitle('Hapus Bank')
    setConfirmMessage('Hapus bank ini dari daftar? Tindakan ini tidak bisa dibatalkan.')
    setConfirmConfirmLabel('Hapus')
    setConfirmAction(() => async () => {
      try {
        await axios.delete(`/api/banks/${id}`)
        setBanks((prev) => prev.filter((x) => x.id !== id))
      } catch (err) {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.title
        const status = err?.response?.status
        const message = err?.response ? apiMessage || `Gagal menghapus (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
        setBankError(message)
        throw err
      }
    })
    setIsConfirmOpen(true)
  }

  const saveGeneral = async (e) => {
    e.preventDefault()
    setGeneralError('')
    try {
      const res = await axios.put('/api/settings/general', {
        language: generalLanguage,
        dateFormat: generalDateFormat,
        numberLocale: generalNumberLocale,
        defaultBankId: generalDefaultBankId ? Number(generalDefaultBankId) : null,
      })
      const lang = res.data?.language || generalLanguage
      const df = res.data?.dateFormat || generalDateFormat
      const nl = res.data?.numberLocale || generalNumberLocale
      const db = res.data?.defaultBankId != null ? String(res.data.defaultBankId) : ''
      setGeneralLanguage(lang)
      setGeneralDateFormat(df)
      setGeneralNumberLocale(nl)
      setGeneralDefaultBankId(db)
      localStorage.setItem('prefs_language', lang)
      localStorage.setItem('prefs_dateFormat', df)
      localStorage.setItem('prefs_numberLocale', nl)
      if (db) localStorage.setItem('prefs_defaultBankId', db)
      else localStorage.removeItem('prefs_defaultBankId')
      window.dispatchEvent(new Event('prefs-updated'))
      window.dispatchEvent(new Event('auth-updated'))
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        localStorage.removeItem('auth_dob')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menyimpan (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan (default: http://localhost:5116).'
      setGeneralError(message)
    }
  }

  const loadDirectory = useCallback(async () => {
    setDirectoryError('')
    setDirectoryLoading(true)
    try {
      const res = await axios.get('/api/settings/directory', {
        params: { page: directoryPage, pageSize: directoryPageSize, query: directoryQuery || undefined },
      })
      setDirectoryItems(res.data?.data || [])
      setDirectoryTotal(Number(res.data?.total) || 0)
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        localStorage.removeItem('auth_dob')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal memuat directory (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan (default: http://localhost:5116).'
      setDirectoryError(message)
      setDirectoryItems([])
      setDirectoryTotal(0)
    } finally {
      setDirectoryLoading(false)
    }
  }, [directoryPage, directoryPageSize, directoryQuery, navigate])

  useEffect(() => {
    loadDirectory()
  }, [loadDirectory])

  const startEditTerm = (row) => {
    setEditingTermId(row.id)
    setEditTermKey(row.key)
    setEditTermIdText(row.indonesian)
    setEditTermEnText(row.english)
  }

  const cancelEditTerm = () => {
    setEditingTermId(null)
    setEditTermKey('')
    setEditTermIdText('')
    setEditTermEnText('')
  }

  const saveEditTerm = async (id) => {
    setDirectoryError('')
    const key = editTermKey.trim()
    if (!key) {
      setDirectoryError('Key wajib diisi.')
      return
    }
    try {
      const res = await axios.put(`/api/settings/directory/${id}`, {
        key,
        indonesian: editTermIdText,
        english: editTermEnText,
      })
      const updated = res.data?.data
      setDirectoryItems((prev) => prev.map((x) => (x.id === id ? updated : x)))
      cancelEditTerm()
      window.dispatchEvent(new Event('auth-updated'))
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setDirectoryError(message)
    }
  }

  const deleteTerm = async (id) => {
    setDirectoryError('')
    setConfirmTitle('Hapus Istilah')
    setConfirmMessage('Hapus istilah ini dari directory? Tindakan ini tidak bisa dibatalkan.')
    setConfirmConfirmLabel('Hapus')
    setConfirmAction(() => async () => {
      await axios.delete(`/api/settings/directory/${id}`)
      setDirectoryItems((prev) => prev.filter((x) => x.id !== id))
      setDirectoryTotal((v) => Math.max(0, v - 1))
      window.dispatchEvent(new Event('auth-updated'))
    })
    setIsConfirmOpen(true)
  }

  const testGeminiConnection = async () => {
    setGeminiTestResult('')
    setGeminiError('')
    setGeminiTestLoading(true)
    try {
      const img =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgV8Kf3cAAAAASUVORK5CYII='
      const res = await axios.post('/api/integrations/gemini/test', { imageBase64: img, mimeType: 'image/png' })
      setGeminiTestResult(res.data?.message || 'Test connection berhasil.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const details = err?.response?.data?.details
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Test connection gagal (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      const shortDetails = details ? `\n\n${String(details).slice(0, 400)}` : ''
      setGeminiTestResult(`${message}${shortDetails}`)
    } finally {
      setGeminiTestLoading(false)
      setIsTestGeminiOpen(true)
    }
  }

  const saveGemini = async (e) => {
    e.preventDefault()
    setGeminiError('')
    const apiKey = geminiKey.trim()
    if (!apiKey || apiKey.length < 10) {
      setGeminiError('API key tidak valid.')
      return
    }
    try {
      const res = await axios.put('/api/integrations/gemini', { apiKey })
      setGeminiConfigured(Boolean(res.data?.configured))
      setGeminiSuffix(res.data?.suffix || '')
      setGeminiKey('')
      setGeminiShowKey(false)
      setIsGeminiKeyOpen(false)
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_email')
        localStorage.removeItem('auth_name')
        navigate('/login', { replace: true })
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setGeminiError(message)
    }
  }

  const deleteGemini = async () => {
    setGeminiError('')
    setConfirmTitle('Hapus API Key Gemini')
    setConfirmMessage('Hapus API key Gemini? Integrasi AI tidak akan bisa dipakai sampai key ditambahkan lagi.')
    setConfirmConfirmLabel('Hapus')
    setConfirmAction(() => async () => {
      try {
        await axios.delete('/api/integrations/gemini')
        setGeminiConfigured(false)
        setGeminiSuffix('')
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_email')
          localStorage.removeItem('auth_name')
          navigate('/login', { replace: true })
          return
        }
        const apiMessage = err?.response?.data?.message || err?.response?.data?.title
        const status = err?.response?.status
        const message = err?.response ? apiMessage || `Gagal menghapus (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
        setGeminiError(message)
        throw err
      }
    })
    setIsConfirmOpen(true)
  }

  const displayName = accountName || accountEmail || 'User'
  const dmyDob = (() => {
    if (!accountDob) return ''
    const m = String(accountDob).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return accountDob
    return `${m[3]}/${m[2]}/${m[1]}`
  })()

  return (
    <>
      <DashboardLayout>
        {(() => {
          const tabRoutes = {
            account: '/settings/account',
            general: '/settings/general',
            directory: '/settings/general/directory',
            categories: '/settings/data-management/categories',
            banks: '/settings/data-management/banks',
            integrations: '/settings/integrations',
            smtp: '/settings/smtp',
            about: '/settings/about',
          }

          const menuItems = [
            { key: 'account', label: t('settings.account', 'Akun'), icon: User, group: 'settings' },
            { key: 'general', label: t('settings.general', 'Umum'), icon: SettingsIcon, group: 'settings' },
            { key: 'directory', label: t('settings.directory', 'Direktori'), icon: Book, group: 'settings' },
            { key: 'categories', label: t('settings.categories', 'Kategori'), icon: Library, meta: String(categories.length), group: 'data' },
            { key: 'banks', label: t('settings.banks', 'Bank'), icon: LayoutGrid, meta: String(banks.length), group: 'data' },
            { key: 'integrations', label: t('settings.integrations', 'Integrasi'), icon: Share2, group: 'integrations' },
            isAdmin && { key: 'smtp', label: 'SMTP Config', icon: Mail, group: 'integrations' },
            { key: 'about', label: 'About FinTrack', icon: Info, group: 'about' },
          ].filter(Boolean)

          const q = menuQuery.trim().toLowerCase()
          const searchItems = [
            { tab: 'account', anchor: 'account-info', title: 'Account > Informasi akun', desc: 'Email dan status login.', keywords: ['account', 'akun', 'email', 'login'] },
            { tab: 'account', anchor: 'profile', title: 'Account > Profil', desc: 'Pengaturan nama dan tanggal lahir.', keywords: ['profil', 'nama', 'tanggal lahir', 'dob', 'lahir', 'birth'] },
            { tab: 'account', anchor: 'change-password', title: 'Account > Ubah password', desc: 'Ganti password akun Anda.', keywords: ['password', 'sandi', 'ubah password', 'keamanan', 'security', 'ganti'] },
            { tab: 'general', anchor: 'general', title: 'General > Format tanggal', desc: 'Pilihan format DMY, MDY, atau YMD.', keywords: ['general', 'tanggal', 'format tanggal', 'date', 'dmy', 'mdy', 'ymd'] },
            { tab: 'general', anchor: 'general', title: 'General > Format angka', desc: 'Pemisah ribuan dan desimal (id-ID / en-US).', keywords: ['angka', 'number', 'ribuan', 'decimal', 'pemisah', 'locale', 'rupiah', 'format'] },
            { tab: 'general', anchor: 'general', title: 'General > Default bank', desc: 'Pilih bank utama untuk transaksi baru.', keywords: ['bank default', 'default bank', 'bank', 'rekening', 'utama'] },
            { tab: 'directory', anchor: 'directory', title: 'Directory > Kamus istilah', desc: 'Terjemahan istilah sistem (ID/EN).', keywords: ['directory', 'kamus', 'bahasa', 'indonesia', 'inggris', 'translate', 'istilah', 'keterangan'] },
            { tab: 'integrations', anchor: 'gemini', title: 'Integrasi > Gemini Vision', desc: 'Setting API Key Google Gemini untuk AI.', keywords: ['integrasi', 'gemini', 'vision', 'api key', 'apikey', 'ocr', 'baca struk'] },
            { tab: 'integrations', anchor: 'gemini', title: 'Integrasi > Test koneksi Gemini', desc: 'Cek apakah API Key Gemini berfungsi.', keywords: ['test', 'connection', 'koneksi', 'gemini', 'check'] },
            isAdmin && { tab: 'smtp', anchor: 'smtp', title: 'SMTP > Konfigurasi email', desc: 'Setting host, port, dan user untuk Brevo/SMTP.', keywords: ['smtp', 'email', 'brevo', 'host', 'port', 'sender', 'pengirim', 'password smtp', 'user smtp', 'forgot password'] },
            isAdmin && { tab: 'smtp', anchor: 'smtp', title: 'SMTP > Test kirim email', desc: 'Coba kirim email simulasi ke alamat Anda.', keywords: ['test', 'check', 'cek', 'koneksi', 'smtp', 'kirim email', 'percobaan'] },
            { tab: 'categories', anchor: 'categories', title: 'Kategori > Kelola kategori', desc: 'List kategori pemasukan & pengeluaran.', keywords: ['kategori', 'category', 'pemasukan', 'pengeluaran', 'edit kategori', 'hapus kategori'] },
            { tab: 'banks', anchor: 'banks', title: 'Bank > Kelola daftar bank', desc: 'Manajemen rekening bank dan status aktif.', keywords: ['bank', 'rekening', 'bca', 'mandiri', 'bni', 'bri', 'tambah bank', 'aktif bank'] },
            { tab: 'about', anchor: 'about', title: 'About > Tentang FinTrack', desc: 'Detail versi dan informasi pengembang.', keywords: ['about', 'tentang', 'fintrack', 'versi', 'aplikasi'] },
          ].filter(Boolean)
          const searchResults =
            q.length === 0
              ? []
              : searchItems
                  .filter((x) => x.title.toLowerCase().includes(q) || x.keywords.some((k) => k.includes(q)) || (x.desc && x.desc.toLowerCase().includes(q)))
                  .slice(0, 10)

          const headerAction =
            tab === 'categories'
              ? { label: 'Tambah Kategori', onClick: () => setIsAddCategoryOpen(true) }
              : tab === 'banks'
              ? { label: 'Tambah Bank', onClick: () => setIsAddBankOpen(true) }
              : tab === 'integrations'
              ? { label: 'Atur Gemini Key', onClick: () => setIsGeminiKeyOpen(true) }
              : null

          const refresh = () => {
            if (tab === 'account') return loadMe()
            if (tab === 'general') return loadGeneral()
            if (tab === 'directory') return loadDirectory()
            if (tab === 'categories') return load()
            if (tab === 'banks') return loadBanks()
            if (tab === 'integrations') return loadGemini()
            return null
          }

          const go = (key, anchor) => {
            setMenuQuery('') // Reset search on navigate
            setTab(key)
            const base = tabRoutes[key] || `/settings/${key}`
            navigate(`${base}${anchor ? `#${anchor}` : ''}`, { replace: true })
            if (anchor) {
              setTimeout(() => {
                const el = document.getElementById(anchor)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 50)
            }
          }

          const renderMenuSection = (title, groupKey) => {
            const items = menuItems.filter(x => x.group === groupKey);
            if (items.length === 0) return null;
            return (
              <div className="mb-6 last:mb-0">
                <div className="px-3 pb-2 text-[10px] uppercase font-black tracking-[0.1em] text-slate-400">
                  {title}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => go(item.key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-semibold'
                        }`}
                      >
                        <span className="text-sm font-bold flex-1 text-left">{item.label}</span>
                        {item.meta ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.meta}
                          </span>
                        ) : (
                          isActive && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
              <aside className="bg-white border border-slate-200/60 rounded-3xl shadow-sm p-6 h-fit sticky top-0">
                <div className="flex items-baseline gap-2 mb-6">
                  <div className="text-lg font-black text-slate-900 tracking-tight leading-tight">Settings</div>
                </div>

                <div className="mb-6 relative group">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Search size={16} />
                  </div>
                  <input
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-10 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    placeholder="Search settings..."
                  />
                  {menuQuery ? (
                    <button 
                      onClick={() => setMenuQuery('')}
                      className="absolute right-3 top-2.5 h-7 w-7 flex items-center justify-center rounded-lg bg-slate-200/50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                  ) : null}

                  {q && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto anima-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Search Results
                      </div>
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <div className="text-slate-300 mb-1"><Search size={24} className="inline" /></div>
                          <div className="text-xs font-bold text-slate-500">No results found for "{q}"</div>
                        </div>
                      ) : (
                        <div className="p-1.5">
                          {searchResults.map((r, idx) => (
                            <button
                              key={`${r.tab}-${r.anchor}-${idx}`}
                              type="button"
                              onClick={() => go(r.tab, r.anchor)}
                              className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 group transition-colors"
                            >
                              <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{r.title}</div>
                              {r.desc && <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{r.desc}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {renderMenuSection(t('settings.title', 'Pengaturan'), 'settings')}
                  {renderMenuSection(t('settings.dataManagement', 'Data Management'), 'data')}
                  {renderMenuSection(t('settings.integrations', 'Integrasi'), 'integrations')}
                  {renderMenuSection('About', 'about')}
                </div>
              </aside>

              <main className="space-y-6">
                <div className="flex items-start justify-between gap-4 p-6 bg-white border border-slate-200/60 rounded-3xl shadow-sm">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-3 leading-tight">
                      {tab === 'account'
                        ? 'Akun'
                        : tab === 'general'
                        ? 'Umum'
                        : tab === 'directory'
                        ? 'Direktori'
                        : tab === 'categories'
                        ? 'Kategori'
                        : tab === 'banks'
                        ? 'Bank'
                        : tab === 'integrations'
                        ? 'Integrasi'
                        : tab === 'smtp'
                        ? 'Pengaturan SMTP'
                        : 'About'}
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0 self-center" />
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {tab === 'account'
                        ? 'Informasi akun, profil, dan keamanan password.'
                        : tab === 'general'
                        ? 'Atur format tampilan dan default bank.'
                        : tab === 'directory'
                        ? 'Atur istilah Bahasa Indonesia dan English untuk UI.'
                        : tab === 'categories'
                        ? 'Kelola kategori transaksi (Pemasukan, Pengeluaran).'
                        : tab === 'banks'
                        ? 'Kelola daftar bank untuk upload/scan.'
                        : tab === 'integrations'
                        ? 'Kelola integrasi pihak ketiga seperti Gemini.'
                        : tab === 'smtp'
                        ? 'Konfigurasi Email SMTP untuk Forgot Password.'
                        : 'Informasi mengenai aplikasi FinTrack.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={refresh} 
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                    {headerAction ? (
                      <button
                        type="button"
                        onClick={headerAction.onClick}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold px-5 py-2.5 text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Plus size={16} />
                        {headerAction.label}
                      </button>
                    ) : null}
                  </div>
                </div>

                {tab === 'account' ? (
                  <div className="mt-6 space-y-6">
                    <div id="account-info" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="font-bold text-slate-900">Account information</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => go('account', 'profile')}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit Profil
                          </button>
                        </div>
                      </div>
                      <div className="px-6 py-5">
                        <div className="text-lg font-extrabold text-slate-900">{displayName}</div>
                        <div className="mt-1 text-sm text-slate-500">{accountEmail || '-'}</div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-xs text-slate-500">Tanggal Lahir</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{dmyDob || '-'}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-xs text-slate-500">Format disimpan</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{accountDob || '-'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div id="profile" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                      <div className="text-lg font-extrabold text-slate-900 tracking-tight">Profil</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Atur nama dan tanggal lahir (untuk PDF bank yang diproteksi).
                      </div>

                      {profileError ? (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {profileError}
                        </div>
                      ) : null}

                      {profileSuccess ? (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {profileSuccess}
                        </div>
                      ) : null}

                      <form onSubmit={saveProfile} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama</label>
                          <input
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            type="text"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Contoh: Yoga Hendrapratama"
                            maxLength={120}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                          <DateInputDMY
                            value={profileDob}
                            onChange={setProfileDob}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                          <div className="mt-1 text-xs text-slate-500">Disimpan sebagai yyyy-mm-dd.</div>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={profileLoading}
                            className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {profileLoading ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div id="change-password" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                      <div className="text-lg font-extrabold text-slate-900 tracking-tight">Ubah Password</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Atur password baru untuk akun Anda.
                      </div>

                      {cpError ? (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {cpError}
                        </div>
                      ) : null}

                      {cpSuccess ? (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {cpSuccess}
                        </div>
                      ) : null}

                      <form onSubmit={changePassword} className="mt-5 max-w-sm space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Password Lama</label>
                          <input
                            type="password"
                            value={cpData.oldPassword}
                            onChange={(e) => setCpData({ ...cpData, oldPassword: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru</label>
                          <input
                            type="password"
                            value={cpData.newPassword}
                            onChange={(e) => setCpData({ ...cpData, newPassword: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Minimal 8 karakter"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={cpLoading}
                          className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {cpLoading ? 'Memproses...' : 'Ubah Password'}
                        </button>
                      </form>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900 tracking-tight">Gemini Vision</div>
                          <div className="mt-1 text-sm text-slate-500">
                            API key untuk membaca dan menganalisis dokumen bank.
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                              geminiConfigured
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {geminiLoading ? 'Memuat...' : geminiConfigured ? 'Terkonfigurasi' : 'Belum'}
                          </div>
                          {geminiConfigured && geminiSuffix ? (
                            <div className="mt-1 text-xs text-slate-500">Akhir key: ••••{geminiSuffix}</div>
                          ) : null}
                        </div>
                      </div>

                      {geminiError ? (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {geminiError}
                        </div>
                      ) : null}

                      <div className="mt-5 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsGeminiKeyOpen(true)}
                          className="rounded-xl bg-indigo-600 text-white font-semibold px-4 py-2.5 hover:bg-indigo-700"
                        >
                          {geminiConfigured ? 'Update Key' : 'Tambah Key'}
                        </button>
                        {geminiConfigured ? (
                          <button
                            type="button"
                            onClick={deleteGemini}
                            className="rounded-xl border border-red-200 text-red-700 font-semibold px-4 py-2.5 hover:bg-red-50"
                          >
                            Hapus Key
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => go('integrations', 'gemini')}
                          className="rounded-xl border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 hover:bg-slate-50"
                        >
                          Buka Integrasi
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (tab === 'smtp' && isAdmin) ? (
                  <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    {smtpError && (
                      <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {smtpError}
                      </div>
                    )}
                    {smtpSuccess && (
                      <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {smtpSuccess}
                      </div>
                    )}
                    
                    <form onSubmit={saveSmtp} className="space-y-4 max-w-xl">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Host SMTP</label>
                            <input
                              type="text"
                              value={smtpConfig.host}
                              onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="smtp-relay.brevo.com"
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Port</label>
                            <input
                              type="number"
                              value={smtpConfig.port}
                              onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                         </div>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Username (Email SMTP)</label>
                          <input
                            type="text"
                            value={smtpConfig.username}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Password SMTP</label>
                          <input
                            type="password"
                            value={smtpConfig.password}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Pengirim</label>
                            <input
                              type="email"
                              value={smtpConfig.senderEmail}
                              onChange={(e) => setSmtpConfig({ ...smtpConfig, senderEmail: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="no-reply@finance.local"
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pengirim</label>
                            <input
                              type="text"
                              value={smtpConfig.senderName}
                              onChange={(e) => setSmtpConfig({ ...smtpConfig, senderName: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="Finance Tracker"
                            />
                         </div>
                       </div>

                       <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Email Admin (Notifikasi Bug)</label>
                          <input
                            type="email"
                            value={smtpConfig.adminEmail}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, adminEmail: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="admin@domain.com"
                          />
                       </div>
                       
                       <div className="pt-2 flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={smtpLoading}
                            className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {smtpLoading ? 'Menyimpan...' : 'Simpan SMTP'}
                          </button>
                          <button
                            type="button"
                            onClick={testSmtp}
                            disabled={smtpTestLoading}
                            className="rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 font-semibold px-5 py-3 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {smtpTestLoading ? 'Mengetes...' : 'Test Koneksi SMTP'}
                          </button>
                       </div>
                    </form>
                  </div>
                ) : tab === 'general' ? (
                  <div id="general" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    {generalError ? (
                      <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {generalError}
                      </div>
                    ) : null}

                    <form onSubmit={saveGeneral} className="space-y-5">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Bahasa</label>
                          <SearchableSelect
                            value={generalLanguage}
                            onChange={(v) => setGeneralLanguage(String(v))}
                            options={[
                              { value: 'id', label: 'Bahasa Indonesia' },
                              { value: 'en', label: 'English' },
                            ]}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={generalLoading}
                            searchThreshold={99}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Format tanggal</label>
                          <SearchableSelect
                            value={generalDateFormat}
                            onChange={(v) => setGeneralDateFormat(String(v))}
                            options={[
                              { value: 'DMY', label: 'DD/MM/YYYY' },
                              { value: 'MDY', label: 'MM/DD/YYYY' },
                              { value: 'YMD', label: 'YYYY-MM-DD' },
                            ]}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={generalLoading}
                            searchThreshold={99}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Format angka</label>
                          <SearchableSelect
                            value={generalNumberLocale}
                            onChange={(v) => setGeneralNumberLocale(String(v))}
                            options={[
                              { value: 'id-ID', label: 'Indonesia (1.234,56)' },
                              { value: 'en-US', label: 'US (1,234.56)' },
                            ]}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={generalLoading}
                            searchThreshold={99}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Default bank</label>
                          <SearchableSelect
                            value={generalDefaultBankId}
                            onChange={(v) => setGeneralDefaultBankId(String(v))}
                            options={banks
                              .slice()
                              .filter((b) => b.isActive)
                              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                              .map((b) => ({ value: String(b.id), label: `${b.name} (${b.code})` }))}
                            emptyLabel="Tidak ada"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={generalLoading}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="submit"
                          disabled={generalLoading}
                          className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Simpan
                        </button>
                        <div className="text-xs text-slate-500">
                          Pengaturan ini akan dipakai untuk tampilan tanggal/angka dan default pilihan bank (upload/scan).
                        </div>
                      </div>
                    </form>
                  </div>
                ) : tab === 'directory' ? (
                  <div id="directory" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                      <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-3 text-lg font-extrabold text-slate-900 tracking-tight">
                            Directory
                            {!isAdmin && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-amber-200">Admin Only</span>}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            Kelola istilah Bahasa Indonesia dan English untuk tampilan aplikasi.
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {directoryTotal} item
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
                        <input
                          value={directoryQuery}
                          onChange={(e) => {
                            setDirectoryQuery(e.target.value)
                            setDirectoryPage(1)
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Cari key/istilah..."
                        />
                        <SearchableSelect
                          value={String(directoryPageSize)}
                          onChange={(v) => {
                            setDirectoryPageSize(Number(v))
                            setDirectoryPage(1)
                          }}
                          options={[
                            { value: '10', label: '10 / page' },
                            { value: '20', label: '20 / page' },
                            { value: '50', label: '50 / page' },
                          ]}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          searchThreshold={99}
                        />
                      </div>

                      {directoryError ? (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {directoryError}
                        </div>
                      ) : null}
                    </div>

                    {directoryLoading ? (
                      <div className="p-6 text-slate-500">Memuat...</div>
                    ) : directoryItems.length === 0 ? (
                      <div className="p-6 text-slate-500">Tidak ada data.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="text-left font-semibold px-5 py-3 w-64">Key</th>
                              <th className="text-left font-semibold px-5 py-3">Indonesia</th>
                              <th className="text-left font-semibold px-5 py-3">English</th>
                              {isAdmin && <th className="text-right font-semibold px-5 py-3 w-56">Aksi</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {directoryItems.map((row) => {
                              const isEditing = editingTermId === row.id
                              return (
                                <tr key={row.id} className="hover:bg-slate-50">
                                  <td className="px-5 py-3 font-mono text-slate-700">
                                    {isEditing ? (
                                      <input
                                        value={editTermKey}
                                        onChange={(e) => setEditTermKey(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                      />
                                    ) : (
                                      row.key
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    {isEditing ? (
                                      <input
                                        value={editTermIdText}
                                        onChange={(e) => setEditTermIdText(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                      />
                                    ) : (
                                      <span className="text-slate-800">{row.indonesian}</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    {isEditing ? (
                                      <input
                                        value={editTermEnText}
                                        onChange={(e) => setEditTermEnText(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                      />
                                    ) : (
                                      <span className="text-slate-800">{row.english}</span>
                                    )}
                                  </td>
                                  {isAdmin && (
                                    <td className="px-5 py-3 text-right">
                                      {isEditing ? (
                                        <div className="inline-flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => saveEditTerm(row.id)}
                                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                                          >
                                            Simpan
                                          </button>
                                          <button
                                            type="button"
                                            onClick={cancelEditTerm}
                                            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="inline-flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => startEditTerm(row)}
                                            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => deleteTerm(row.id)}
                                            className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-slate-600">
                        Page {directoryPage} of {Math.max(1, Math.ceil(directoryTotal / directoryPageSize))}
                      </div>
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}
                          disabled={directoryPage <= 1}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectoryPage((p) => p + 1)}
                          disabled={directoryPage >= Math.max(1, Math.ceil(directoryTotal / directoryPageSize))}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : tab === 'categories' ? (
                  <>
                    {error ? (
                      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    ) : null}

                    <div id="categories" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 font-semibold text-slate-800">
                          Kategori
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xs text-slate-500">{categories.length} item</div>
                        </div>
                      </div>

                      {loading ? (
                        <div className="p-6 text-slate-500">Memuat...</div>
                      ) : categories.length === 0 ? (
                        <div className="p-6 text-slate-500">Belum ada kategori.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="text-left font-semibold px-5 py-3">Nama</th>
                                <th className="text-left font-semibold px-5 py-3">Tipe</th>
                                <th className="text-right font-semibold px-5 py-3 w-56">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {categories
                                .slice()
                                .sort((a, b) => Number(a.type) - Number(b.type) || String(a.name).localeCompare(String(b.name)))
                                .map((c) => {
                                  const isEditing = editingId === c.id
                                  return (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                      <td className="px-5 py-3">
                                        {isEditing ? (
                                          <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                          />
                                        ) : (
                                          <span className="font-medium text-slate-800">{c.name}</span>
                                        )}
                                      </td>
                                      <td className="px-5 py-3">
                                        {isEditing ? (
                                          <SearchableSelect
                                            value={editType}
                                            onChange={(v) => setEditType(Number(v))}
                                            options={TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            searchThreshold={99}
                                          />
                                        ) : (
                                          <span className="text-slate-700">{typeLabel[String(c.type)] || `Tipe ${c.type}`}</span>
                                        )}
                                      </td>
                                        <td className="px-5 py-3 text-right">
                                          {isEditing ? (
                                            <div className="inline-flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => saveEdit(c.id)}
                                                className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                                              >
                                                Simpan
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                              >
                                                Batal
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="inline-flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => startEdit(c)}
                                                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => deleteCategory(c.id)}
                                                className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                                              >
                                                Hapus
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : tab === 'banks' ? (
                  <>
                    {bankError ? (
                      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {bankError}
                      </div>
                    ) : null}

                    <div id="banks" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 font-semibold text-slate-800">
                          Bank
                          {!isAdmin && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-amber-200">Admin Only</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xs text-slate-500">{banks.length} item</div>
                        </div>
                      </div>

                      {loadingBanks ? (
                        <div className="p-6 text-slate-500">Memuat...</div>
                      ) : banks.length === 0 ? (
                        <div className="p-6 text-slate-500">Belum ada bank.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="text-left font-semibold px-5 py-3">Kode</th>
                                <th className="text-left font-semibold px-5 py-3">Nama</th>
                                <th className="text-left font-semibold px-5 py-3">Status</th>
                                <th className="text-left font-semibold px-5 py-3">Dukungan</th>
                                {isAdmin && <th className="text-right font-semibold px-5 py-3 w-56">Aksi</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {banks
                                .slice()
                                .sort((a, b) => Number(b.isActive) - Number(a.isActive) || String(a.name).localeCompare(String(b.name)))
                                .map((b) => {
                                  const isEditing = editingBankId === b.id
                                  return (
                                    <tr key={b.id} className="hover:bg-slate-50">
                                      <td className="px-5 py-3">
                                        <span className="font-mono text-slate-800">{b.code}</span>
                                      </td>
                                      <td className="px-5 py-3">
                                        {isEditing ? (
                                          <input
                                            value={editBankName}
                                            onChange={(e) => setEditBankName(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                          />
                                        ) : (
                                          <span className="font-medium text-slate-800">{b.name}</span>
                                        )}
                                      </td>
                                      <td className="px-5 py-3">
                                        <button
                                          type="button"
                                          disabled={!isAdmin}
                                          onClick={() => toggleBankActive(b)}
                                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                                            b.isActive
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                              : 'bg-slate-50 text-slate-600 border-slate-200'
                                          } ${!isAdmin && 'cursor-default'}`}
                                        >
                                          {b.isActive ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                      </td>
                                      <td className="px-5 py-3">
                                        <span
                                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                                            b.isSupported
                                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                                              : 'bg-amber-50 text-amber-700 border-amber-100'
                                          }`}
                                        >
                                          {b.isSupported ? 'Didukung' : 'Belum'}
                                        </span>
                                      </td>
                                      {isAdmin && (
                                        <td className="px-5 py-3 text-right">
                                          {isEditing ? (
                                            <div className="inline-flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => saveEditBank(b.id)}
                                                className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                                              >
                                                Simpan
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelEditBank}
                                                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                              >
                                                Batal
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="inline-flex gap-2">
                                              <button
                                                type="button"
                                                onClick={() => startEditBank(b)}
                                                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => deleteBank(b.id)}
                                                className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                                              >
                                                Hapus
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : tab === 'integrations' ? (
                  <>
                    {geminiError ? (
                      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {geminiError}
                      </div>
                    ) : null}

                    <div id="gemini" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900 tracking-tight">Gemini Vision</div>
                          <div className="mt-1 text-sm text-slate-500 inline-flex items-center gap-2">
                            <span>Simpan API key untuk membaca dan menganalisis dokumen bank.</span>
                            <button
                              type="button"
                              onClick={() => setIsGeminiHelpOpen(true)}
                              className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                              aria-label="Cara mendapatkan API key Gemini"
                            >
                              ?
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                              geminiConfigured
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {geminiLoading ? 'Memuat...' : geminiConfigured ? 'Terkonfigurasi' : 'Belum'}
                          </div>
                          {geminiConfigured && geminiSuffix ? (
                            <div className="mt-1 text-xs text-slate-500">Akhir key: ••••{geminiSuffix}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsGeminiKeyOpen(true)}
                          className="rounded-xl bg-indigo-600 text-white font-semibold px-4 py-2.5 hover:bg-indigo-700"
                        >
                          {geminiConfigured ? 'Update Key' : 'Tambah Key'}
                        </button>
                        <button
                          type="button"
                          onClick={testGeminiConnection}
                          disabled={!geminiConfigured || geminiTestLoading}
                          className="rounded-xl border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {geminiTestLoading ? 'Testing...' : 'Test Connection'}
                        </button>
                        {geminiConfigured ? (
                          <button
                            type="button"
                            onClick={deleteGemini}
                            className="rounded-xl border border-red-200 text-red-700 font-semibold px-4 py-2.5 hover:bg-red-50"
                          >
                            Hapus Key
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div id="about" className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="text-2xl font-extrabold text-slate-900 tracking-tight">About FinTrack</div>
                    <div className="mt-3 text-slate-600 leading-relaxed space-y-3">
                      <p>
                        FinTrack adalah aplikasi personal finance untuk membantu kamu mencatat transaksi, memantau saldo bulanan,
                        dan melihat ringkasan keuangan dalam satu dashboard.
                      </p>
                      <p>
                        Fitur utama: login/register, profil (nama & tanggal lahir untuk dokumen bank yang diproteksi), saldo bulanan
                        per rekening, upload/scan mutasi, kategorisasi transaksi, laporan, dan pengaturan master (kategori, bank).
                      </p>
                      <p>
                        FinTrack juga mendukung integrasi AI (Gemini Vision) agar dokumen bank bisa dibaca dan dianalisis otomatis.
                        API key disimpan terenkripsi di database, dan aplikasi hanya menampilkan 4 karakter terakhir sebagai indikator.
                      </p>
                      <p className="text-sm text-slate-500">
                        Tips keamanan: gunakan password yang kuat, jangan bagikan API key, dan pastikan kunci enkripsi server diset
                        lewat environment variable di production.
                      </p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )
        })()}
      </DashboardLayout>

      <Modal
        open={isAddCategoryOpen}
        title="Tambah Kategori Baru"
        onClose={() => setIsAddCategoryOpen(false)}
      >
        <form onSubmit={addCategory} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Kategori</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              placeholder="Contoh: Makan Siang"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Jenis Transaksi</label>
            <SearchableSelect
              value={newType}
              onChange={(v) => setNewType(Number(v))}
              options={TRANSACTION_TYPES}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(false)}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 text-sm"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isAddBankOpen}
        title="Tambah Bank Baru"
        onClose={() => setIsAddBankOpen(false)}
      >
        <form onSubmit={addBank} className="space-y-4">
          {bankError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {bankError}
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Kode Bank (Slug)</label>
            <input
              autoFocus
              value={newBankCode}
              onChange={(e) => setNewBankCode(e.target.value)}
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono uppercase"
              placeholder="BCA"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Bank Lengkap</label>
            <input
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              placeholder="Bank Central Asia"
            />
          </div>
          <div className="flex items-center gap-3 py-2">
              <input 
                id="bank-active"
                type="checkbox" 
                checked={newBankActive}
                onChange={(e) => setNewBankActive(e.target.checked)}
                className="w-5 h-5 rounded-lg text-indigo-600 border-slate-200 focus:ring-indigo-500"
              />
              <label htmlFor="bank-active" className="text-sm font-bold text-slate-700 cursor-pointer">Status Aktif</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddBankOpen(false)}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 text-sm"
            >
              Simpan Bank
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={isConfirmOpen} title={confirmTitle} onClose={() => setIsConfirmOpen(false)}>
        <p className="text-slate-600 font-medium mb-6 text-center">{confirmMessage}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setIsConfirmOpen(false)}
            className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all text-sm"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              if (confirmAction) {
                setConfirmLoading(true)
                try {
                  await confirmAction()
                  setIsConfirmOpen(false)
                } catch {
                  // error handled by action
                } finally {
                  setConfirmLoading(false)
                }
              }
            }}
            disabled={confirmLoading}
            className="flex-[2] rounded-2xl bg-rose-600 text-white font-black py-4 hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 text-sm disabled:opacity-50"
          >
            {confirmLoading ? 'Memproses...' : confirmConfirmLabel}
          </button>
        </div>
      </Modal>

      <Modal open={isGeminiKeyOpen} title="Setup API Key Gemini" onClose={() => setIsGeminiKeyOpen(false)}>
        <form onSubmit={saveGemini} className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700 text-xs font-medium leading-relaxed">
            API Key Anda akan di-hash secara satu arah sebelum disimpan ke database (sisi server) dan tidak akan pernah ditampilkan secara utuh kembali demi keamanan.
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Google AI API Key</label>
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono"
                placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXX"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsGeminiKeyOpen(false)}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 text-sm"
            >
              Simpan & Hash Key
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={isTestGeminiOpen} title="Hasil Test Gemini OCR" onClose={() => setIsTestGeminiOpen(false)}>
        <div className="p-6 bg-slate-900 rounded-2xl font-mono text-xs text-indigo-300 leading-relaxed overflow-auto max-h-[300px] border border-slate-800 shadow-inner">
          {geminiTestResult || 'Output kosong.'}
        </div>
        <div className="mt-6">
          <button
            onClick={() => setIsTestGeminiOpen(false)}
            className="w-full rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 transition-all text-sm"
          >
            Mengerti
          </button>
        </div>
      </Modal>

      <Modal 
        open={isGeminiHelpOpen} 
        title="Bantuan Scan Struk" 
        onClose={() => setIsGeminiHelpOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p className="text-sm">Untuk menggunakan fitur pembaca struk otomatis, Anda memerlukan API Key dari Google Gemini. Ikuti langkah di bawah ini:</p>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <div className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-3">Langkah-langkah</div>
              <ol className="text-sm space-y-3 list-decimal pl-5 text-slate-700 font-medium">
                <li>
                  Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Google AI Studio</a>.
                </li>
                <li>Login dengan akun Google Anda.</li>
                <li>Klik menu <span className="font-bold text-slate-900">"Get API key"</span> di baris kiri.</li>
                <li>Pilih <span className="font-bold text-slate-900">"Create API key in new project"</span>.</li>
                <li>Salin API key yang muncul (biasanya diawali dengan <code className="bg-white px-1.5 py-0.5 rounded border">AIza...</code>).</li>
                <li>Kembali ke FinTrack dan simpan key tersebut di menu Integrasi.</li>
              </ol>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="flex gap-3">
                <Info size={18} className="text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-800 mb-1">Penting</div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    API Key ini GRATIS (dengan batas penggunaan wajar). Jangan bagikan key Anda kepada siapapun. FinTrack akan menyimpan key ini dengan enkripsi aman di database Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setIsGeminiHelpOpen(false)}
            className="w-full rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 transition-all text-sm"
          >
            Selesai
          </button>
        </div>
      </Modal>

      {/* Toast Notification */}
      <div className={`fixed top-8 right-8 z-[110] transition-all duration-500 transform ${
        toast.show ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'
      }`}>
        <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl border ${
          toast.type === 'success' 
            ? 'bg-white border-emerald-100' 
            : 'bg-white border-red-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <div className="flex-1 pr-4">
            <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
              toast.type === 'success' ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {toast.type === 'success' ? 'Berhasil' : 'Kesalahan'}
            </div>
            <div className="text-sm font-bold text-slate-800 leading-tight">{toast.message}</div>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
