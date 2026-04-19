import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import DashboardLayout from '../layouts/DashboardLayout'
import SearchableSelect from '../components/SearchableSelect'
import { 
  Plus, 
  X, 
  Wallet, 
  RefreshCw, 
  Pencil, 
  History, 
  Trash2, 
  Trash,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react'

function Modal({ open, title, children, onClose, maxWidth = 'max-w-2xl' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
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

export default function SaldoAwal() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const numberLocale = localStorage.getItem('prefs_numberLocale') || 'id-ID'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('')
  const [newBankCode, setNewBankCode] = useState('')
  const [newBankName, setNewBankName] = useState('')
  const [newHolderName, setNewHolderName] = useState('')
  const [newAccNumber, setNewAccNumber] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [editBankCode, setEditBankCode] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editHolderName, setEditHolderName] = useState('')
  const [editAccNumber, setEditAccNumber] = useState('')

  const [masterBanks, setMasterBanks] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteAccountId, setDeleteAccountId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 4000)
  }, [])

  const totalBalance = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.balance) || 0), 0)
  }, [rows])

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(r => 
      (r.accountName || '').toLowerCase().includes(q) ||
      (r.bankName || '').toLowerCase().includes(q) ||
      (r.accountNumber || '').toLowerCase().includes(q) ||
      (r.accountHolderName || '').toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await axios.get('/api/monthlybalances', { params: { year, month } })
      setRows(res.data.data || [])
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal memuat (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  const fetchMasterBanks = async () => {
    try {
      const res = await axios.get('/api/banks?active=true')
      setMasterBanks(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch banks', err)
    }
  }

  useEffect(() => {
    load()
    fetchMasterBanks()
  }, [load])

  const addAccount = async (e) => {
    e.preventDefault()
    setError('')
    const name = newName.trim()
    if (!name) {
      setError('Nama akun wajib diisi.')
      return
    }
    const balance = Number(newBalance || 0)
    try {
      const accRes = await axios.post('/api/accounts', { 
        name, 
        balance: 0,
        bankCode: newBankCode.trim(),
        bankName: newBankName.trim(),
        accountHolderName: newHolderName.trim(),
        accountNumber: newAccNumber.trim()
      })
      const accountId = accRes.data.data.id
      const balRes = await axios.post('/api/monthlybalances', {
        accountId,
        year,
        month,
        balance,
      })
      const monthly = balRes.data.data
      setRows((prev) => [
        ...prev,
        {
          accountId,
          accountName: name,
          monthlyBalanceId: monthly.id,
          balance: monthly.balance,
        },
      ])
      setNewName('')
      setNewBalance('')
      setNewBankCode('')
      setNewBankName('')
      setNewHolderName('')
      setNewAccNumber('')
      setIsAddModalOpen(false)
      load() // Reload to get the full data structure in rows
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menambah (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
    }
  }

  const startEdit = (r) => {
    setEditingId(r.accountId)
    setEditName(r.accountName || '')
    setEditBalance(String(r.balance ?? ''))
    setEditBankCode(r.bankCode || '')
    setEditBankName(r.bankName || '')
    setEditHolderName(r.accountHolderName || '')
    setEditAccNumber(r.accountNumber || '')
    setIsEditModalOpen(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditBalance('')
    setEditBankCode('')
    setEditBankName('')
    setEditHolderName('')
    setEditAccNumber('')
    setIsEditModalOpen(false)
  }

  const saveEdit = async (accountId) => {
    setError('')
    const name = editName.trim()
    if (!name) {
      setError('Nama akun wajib diisi.')
      return
    }
    const balance = Number(editBalance || 0)
    try {
      await axios.put(`/api/accounts/${accountId}`, { 
        name, 
        balance: 0,
        bankCode: editBankCode.trim(),
        bankName: editBankName.trim(),
        accountHolderName: editHolderName.trim(),
        accountNumber: editAccNumber.trim()
      })
      const balRes = await axios.post('/api/monthlybalances', {
        accountId,
        year,
        month,
        balance,
      })
      const monthly = balRes.data.data
      setRows((prev) =>
        prev.map((x) =>
          x.accountId === accountId
            ? {
                ...x,
                accountName: name,
                monthlyBalanceId: monthly.id,
                balance: monthly.balance,
                closingBalance: monthly.balance + (x.income || 0) - (x.expense || 0),
                bankName: editBankName,
                bankCode: editBankCode,
                accountHolderName: editHolderName,
                accountNumber: editAccNumber
              }
            : x
        )
      )
      setIsEditModalOpen(false)
      showNotification('Informasi akun berhasil diperbarui.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menyimpan (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
    }
  }

  const deleteMonthlyBalance = async (accountId) => {
    setError('')
    const ok = window.confirm('Hapus saldo untuk bulan ini?')
    if (!ok) return
    try {
      await axios.delete('/api/monthlybalances', { params: { accountId, year, month } })
      setRows((prev) =>
        prev.map((x) => (x.accountId === accountId ? { ...x, monthlyBalanceId: null, balance: null } : x))
      )
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal menghapus (HTTP ${status}).` : 'Tidak bisa menghubungi server.'
      setError(message)
    }
  }

  const startDeleteAccount = (id) => {
    setDeleteAccountId(id)
    setDeletePassword('')
    setDeleteError('')
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteAccount = async (e) => {
    e.preventDefault()
    setDeleteError('')
    if (!deletePassword) {
      setDeleteError('Password wajib diisi.')
      return
    }

    setDeleteLoading(true)
    try {
      // 1. Verify password first
      await axios.post('/api/auth/verify-password', { password: deletePassword })
      
      // 2. Delete account
      await axios.delete(`/api/accounts/${deleteAccountId}`)
      
      setRows((prev) => prev.filter((x) => x.accountId !== deleteAccountId))
      setIsDeleteModalOpen(false)
      showNotification('Akun berhasil dihapus.')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Gagal menghapus akun. Periksa password Anda.'
      setDeleteError(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <DashboardLayout>
        <div className="w-full">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daftar Rekening</h1>
              <p className="mt-1 text-slate-500">Kelola rekening dan pantau pergerakan saldo bulanan Anda.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500">Bulan</div>
                <div className="w-24">
                  <SearchableSelect
                    value={month}
                    onChange={(v) => setMonth(Number(v))}
                    options={Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: String(i + 1) }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500">Tahun</div>
                <input
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  type="number"
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="text-right mr-4">
                <div className="text-xs text-slate-500">Total Saldo</div>
                <div className="text-xl font-bold text-slate-900">
                Rp {new Intl.NumberFormat(numberLocale).format(totalBalance)}
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus size={20} />
                Tambah Akun
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <div className="font-semibold text-slate-800 whitespace-nowrap">Status Rekening ({month}/{year})</div>
                <div className="relative flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari akun, bank, atau no rek..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={load}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Refresh"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-slate-500">Memuat...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-6 text-center py-12">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} />
                </div>
                <div className="text-slate-500 font-medium">Data tidak ditemukan</div>
                <div className="text-slate-400 text-xs mt-1">Coba kata kunci pencarian yang lain</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Rekening</th>
                      <th className="text-left font-semibold px-5 py-3">Bank</th>
                      <th className="text-right font-semibold px-5 py-3">Saldo Awal</th>
                      <th className="text-right font-semibold px-5 py-3">Mutasi Bulan Ini</th>
                      <th className="text-right font-semibold px-5 py-3">Saldo Akhir</th>
                      <th className="text-right font-semibold px-5 py-3 w-[15rem]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((r) => {
                      return (
                        <tr key={r.accountId} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div>
                                <div className="font-bold text-slate-900">{r.accountName}</div>
                                <div className="text-xs text-slate-500">{r.accountHolderName || '-'}</div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div>
                                <div className="text-sm font-medium text-slate-700">{r.bankName || r.bankCode || '-'}</div>
                                <div className="text-xs text-slate-400 font-mono">{r.accountNumber || '-'}</div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            {r.balance == null ? (
                              <span className="text-slate-400 italic text-xs">Belum diisi</span>
                            ) : (
                              <span className="text-slate-700 font-medium">
                                Rp {new Intl.NumberFormat(numberLocale).format(r.balance)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {r.income > 0 && (
                                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                  + Rp {new Intl.NumberFormat(numberLocale).format(r.income)}
                                </div>
                              )}
                              {r.expense > 0 && (
                                <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                  - Rp {new Intl.NumberFormat(numberLocale).format(r.expense)}
                                </div>
                              )}
                              {r.income === 0 && r.expense === 0 && (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            Rp {new Intl.NumberFormat(numberLocale).format(r.closingBalance || 0)}
                          </td>
                          <td className="px-5 py-3 text-right">
                               <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(r)}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    title="Edit"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMonthlyBalance(r.accountId)}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                    title="Hapus saldo bulan ini"
                                  >
                                    <History size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startDeleteAccount(r.accountId)}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                    title="Hapus akun permanen"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* MODALS — MOVED OUTSIDE FOR FULL SCREEN BLUR */}
      <Modal
        open={isAddModalOpen}
        title="Tambah Akun Baru"
        onClose={() => setIsAddModalOpen(false)}
      >
        <form onSubmit={addAccount} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Akun / Alias</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="Contoh: Tabungan Utama"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Saldo Bulan Ini</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 font-bold">
                  Rp
                </div>
                <input
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 pl-12 pr-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pilih Bank</label>
              <SearchableSelect
                value={masterBanks.find(b => b.code === newBankCode)?.id || ''}
                onChange={(v) => {
                  const b = masterBanks.find(x => String(x.id) === String(v))
                  if (b) {
                    setNewBankName(b.name)
                    setNewBankCode(b.code)
                  } else {
                    setNewBankName('')
                    setNewBankCode('')
                  }
                }}
                options={masterBanks.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                placeholder="Cari & Pilih Bank..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">No Rekening</label>
              <input
                value={newAccNumber}
                onChange={(e) => setNewAccNumber(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Pemilik</label>
              <input
                value={newHolderName}
                onChange={(e) => setNewHolderName(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="Nama sesuai buku tabungan"
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              Simpan Rekening
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isEditModalOpen}
        title="Ubah Informasi Akun"
        onClose={cancelEdit}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Akun / Alias</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="Contoh: Tabungan Utama"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Saldo Bulan Ini</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 font-bold">
                  Rp
                </div>
                <input
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 pl-12 pr-5 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold"
                />
              </div>
            </div>
            
            <div className="md:col-span-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Estimasi Saldo Akhir</div>
                <div className="text-xl font-black text-indigo-700">
                  Rp {new Intl.NumberFormat(numberLocale).format(
                    (Number(editBalance) || 0) + 
                    (rows.find(x => x.accountId === editingId)?.income || 0) - 
                    (rows.find(x => x.accountId === editingId)?.expense || 0)
                  )}
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400 leading-tight">
                (Berdasarkan mutasi <br/> bulan ini)
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pilih Bank</label>
              <SearchableSelect
                value={masterBanks.find(b => b.code === editBankCode)?.id || ''}
                onChange={(v) => {
                  const b = masterBanks.find(x => String(x.id) === String(v))
                  if (b) {
                    setEditBankName(b.name)
                    setEditBankCode(b.code)
                  } else {
                    setEditBankName('')
                    setEditBankCode('')
                  }
                }}
                options={masterBanks.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">No Rekening</label>
              <input
                value={editAccNumber}
                onChange={(e) => setEditAccNumber(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Pemilik</label>
              <input
                value={editHolderName}
                onChange={(e) => setEditHolderName(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => saveEdit(editingId)}
              className="flex-[2] rounded-2xl bg-indigo-600 text-white font-black py-4 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDeleteModalOpen}
        title="Konfirmasi Hapus Akun"
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Akun Permanen?</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Tindakan ini akan menghapus akun beserta seluruh saldo bulanannya. Masukkan password Anda untuk konfirmasi.
          </p>
        </div>

        <form onSubmit={confirmDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {deleteError}
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Password Anda</label>
            <input
              autoFocus
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-5 py-4 outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/5 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 rounded-2xl border border-slate-200 text-slate-600 font-bold py-4 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={deleteLoading}
              className="flex-[2] rounded-2xl bg-rose-600 text-white font-black py-4 hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {deleteLoading ? 'Memproses...' : 'Ya, Hapus Akun'}
            </button>
          </div>
        </form>
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
