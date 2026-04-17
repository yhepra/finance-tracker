import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Plus, Trash2, TrendingDown, TrendingUp, History, X } from 'lucide-react'
import axios from 'axios'
import DashboardLayout from '../layouts/DashboardLayout'
import SearchableSelect from '../components/SearchableSelect'

const formatRp = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function toInputDateString(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function remainingAmount(it) {
  const amount = Number(it?.amount) || 0
  const paidAmount = Number(it?.paidAmount) || 0
  return Math.max(0, amount - paidAmount)
}

export default function HutangPiutang() {
  const [items, setItems] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [kind, setKind] = useState('piutang')
  const [counterparty, setCounterparty] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [filterKind, setFilterKind] = useState('all')
  const [filterStatus, setFilterStatus] = useState('open')
  const [addError, setAddError] = useState('')

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentTargetId, setPaymentTargetId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => toInputDateString(new Date()))
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState('')
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyTarget, setHistoryTarget] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoadError('')
      setLoadingList(true)
      try {
        const res = await axios.get('/api/debtreceivables')
        const data = Array.isArray(res?.data?.data) ? res.data.data : []
        if (mounted) setItems(data)
      } catch (err) {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.title
        const status = err?.response?.status
        const message = err?.response
          ? apiMessage || `Gagal memuat (HTTP ${status}).`
          : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
        if (mounted) setLoadError(message)
      } finally {
        if (mounted) setLoadingList(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const summary = useMemo(() => {
    let totalPiutang = 0
    let totalHutang = 0
    for (const it of items) {
      if (it?.status !== 'open') continue
      const v = remainingAmount(it)
      if (it?.kind === 'piutang') totalPiutang += v
      if (it?.kind === 'hutang') totalHutang += v
    }
    return { totalPiutang, totalHutang }
  }, [items])

  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        if (filterKind !== 'all' && it?.kind !== filterKind) return false
        if (filterStatus !== 'all' && it?.status !== filterStatus) return false
        return true
      })
      .sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')))
  }, [items, filterKind, filterStatus])

  const resetForm = () => {
    setKind('piutang')
    setCounterparty('')
    setAmount('')
    setDueDate('')
    setNotes('')
    setAddError('')
  }

  const openForm = () => {
    setIsFormOpen(true)
    setIsPaymentOpen(false)
    resetForm()
  }

  const closeForm = () => {
    setIsFormOpen(false)
    resetForm()
  }

  const resetPaymentForm = () => {
    setPaymentTargetId('')
    setPaymentAmount('')
    setPaymentDate(toInputDateString(new Date()))
    setPaymentNotes('')
    setPaymentError('')
  }

  const closePaymentForm = () => {
    setIsPaymentOpen(false)
    resetPaymentForm()
  }

  const openPaymentForm = (id) => {
    setIsPaymentOpen(true)
    setIsFormOpen(false)
    setPaymentTargetId(id)
    setPaymentAmount('')
    setPaymentDate(toInputDateString(new Date()))
    setPaymentNotes('')
    setPaymentError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setAddError('')

    const normalizedCounterparty = counterparty.trim()
    const normalizedAmount = Number(amount)

    if (!normalizedCounterparty) {
      setAddError('Nama wajib diisi.')
      return
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setAddError('Nominal harus angka dan lebih dari 0.')
      return
    }

    try {
      const res = await axios.post('/api/debtreceivables', {
        kind,
        counterparty: normalizedCounterparty,
        amount: normalizedAmount,
        dueDate: dueDate ? `${dueDate}T00:00:00` : null,
        notes: notes.trim() || null,
      })
      const saved = res?.data?.data
      if (saved) setItems((prev) => [saved, ...prev])
      closeForm()
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menyimpan (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setAddError(message)
    }
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    setPaymentError('')

    const pay = Number(paymentAmount)
    if (!paymentTargetId) {
      setPaymentError('Data tidak ditemukan.')
      return
    }
    if (!Number.isFinite(pay) || pay <= 0) {
      setPaymentError('Nominal bayar harus angka dan lebih dari 0.')
      return
    }
    if (!paymentDate) {
      setPaymentError('Tanggal bayar wajib diisi.')
      return
    }

    try {
      const res = await axios.post(`/api/debtreceivables/${paymentTargetId}/payments`, {
        amount: pay,
        date: `${paymentDate}T00:00:00`,
        notes: paymentNotes.trim() || null,
      })
      const updated = res?.data?.data
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
      }
      closePaymentForm()
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menyimpan (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setPaymentError(message)
    }
  }

  const undoPaid = async (id) => {
    try {
      const res = await axios.post(`/api/debtreceivables/${id}/reset`)
      const updated = res?.data?.data
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menyimpan (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setLoadError(message)
    }
  }

  const removeItem = async (id) => {
    try {
      await axios.delete(`/api/debtreceivables/${id}`)
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menghapus (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setLoadError(message)
    }
  }

  return (
    <>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <ArrowRightLeft size={20} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Hutang &amp; Piutang</h1>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Catat hutang (kamu berutang) dan piutang (orang lain berutang ke kamu) agar mudah dipantau.
              </p>
            </div>
            <button
              type="button"
              onClick={openForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shrink-0"
            >
              <Plus size={18} />
              Tambah
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Total Piutang</p>
                    <p className="text-xs text-slate-500">Uang yang seharusnya kamu terima</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">{formatRp(summary.totalPiutang)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Total Hutang</p>
                    <p className="text-xs text-slate-500">Uang yang perlu kamu bayar</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">{formatRp(summary.totalHutang)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Daftar</h2>
                <p className="text-xs text-slate-500">Hutang/piutang yang kamu catat.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <SearchableSelect
                  value={filterKind}
                  onChange={(v) => setFilterKind(String(v))}
                  options={[
                    { value: 'all', label: 'Semua jenis' },
                    { value: 'piutang', label: 'Piutang' },
                    { value: 'hutang', label: 'Hutang' },
                  ]}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <SearchableSelect
                  value={filterStatus}
                  onChange={(v) => setFilterStatus(String(v))}
                  options={[
                    { value: 'open', label: 'Belum lunas' },
                    { value: 'paid', label: 'Lunas' },
                    { value: 'all', label: 'Semua status' },
                  ]}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                  <ArrowRightLeft size={22} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-800">
                  {loadingList ? 'Memuat...' : 'Belum ada data'}
                </p>
                <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                  {loadError ? loadError : 'Klik tombol Tambah untuk input hutang/piutang pertama kamu.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-6 py-3">Jenis</th>
                      <th className="text-left font-semibold px-6 py-3">Nama</th>
                      <th className="text-left font-semibold px-6 py-3">Nominal</th>
                      <th className="text-left font-semibold px-6 py-3">Terbayar</th>
                      <th className="text-left font-semibold px-6 py-3">Sisa</th>
                      <th className="text-left font-semibold px-6 py-3">Jatuh Tempo</th>
                      <th className="text-left font-semibold px-6 py-3">Status</th>
                      <th className="text-right font-semibold px-6 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((it) => {
                      const due = it?.dueDate ? String(it.dueDate).slice(0, 10) : '-'
                      const isPaid = it?.status === 'paid'
                      const isPiutang = it?.kind === 'piutang'
                      const itPaid = Number(it?.paidAmount) || 0
                      const itRemaining = remainingAmount(it)
                      return (
                        <tr key={it.id} className="text-slate-800">
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isPiutang
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}
                            >
                              {isPiutang ? 'Piutang' : 'Hutang'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium">{it?.counterparty || '-'}</td>
                          <td className="px-6 py-4">{formatRp(Number(it?.amount) || 0)}</td>
                          <td className="px-6 py-4">{formatRp(itPaid)}</td>
                          <td className="px-6 py-4 font-semibold">{formatRp(itRemaining)}</td>
                          <td className="px-6 py-4">{due}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isPaid
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                            >
                              {isPaid ? 'Lunas' : 'Belum lunas'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryTarget(it)
                                  setIsHistoryOpen(true)
                                }}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                title="Lihat Riwayat Bayar"
                              >
                                <History size={16} />
                              </button>
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => undoPaid(it.id)}
                                  className="px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                                >
                                  Batalkan lunas
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPaymentForm(it.id)}
                                  className="px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest border-green-200 text-green-700 hover:bg-green-50 transition-all"
                                >
                                  Catat bayar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeItem(it.id)}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                aria-label="Hapus"
                              >
                                <Trash2 size={16} />
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

      <Modal
        open={isFormOpen}
        title="Tambah Hutang / Piutang"
        onClose={closeForm}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {addError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {addError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jenis</label>
              <SearchableSelect
                value={kind}
                onChange={(v) => setKind(String(v))}
                options={[
                  { value: 'piutang', label: 'Piutang (orang lain berutang ke kamu)' },
                  { value: 'hutang', label: 'Hutang (kamu berutang)' },
                ]}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nominal</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama</label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Contoh: Budi / Toko A"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jatuh Tempo (opsional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Contoh: Pinjam untuk keperluan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeForm}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isPaymentOpen}
        title="Catat Pembayaran"
        onClose={closePaymentForm}
      >
        <form onSubmit={submitPayment} className="space-y-4">
          {paymentError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {paymentError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nominal bayar</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal bayar</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan (opsional)</label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={3}
              placeholder="Contoh: bayar cash / transfer"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closePaymentForm}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </Modal>

      {isHistoryOpen && historyTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsHistoryOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Riwayat Pembayaran</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {historyTarget.kind === 'piutang' ? 'Piutang kepada' : 'Hutang kepada'} {historyTarget.counterparty}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all font-bold"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total {historyTarget.kind === 'piutang' ? 'Tagihan' : 'Utang'}</div>
                  <div className="text-lg font-black text-slate-900">{formatRp(historyTarget.amount)}</div>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Sisa Tagihan</div>
                  <div className="text-lg font-black text-indigo-700">{formatRp(remainingAmount(historyTarget))}</div>
                </div>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {(!historyTarget.payments || historyTarget.payments.length === 0) ? (
                  <div className="py-10 text-center text-slate-400 italic text-sm">Belum ada riwayat pembayaran yang tercatat.</div>
                ) : (
                  historyTarget.payments.map((p, idx) => (
                    <div key={p.id || idx} className="relative pl-6 pb-6 last:pb-0">
                      {idx !== historyTarget.payments.length - 1 && (
                        <div className="absolute left-[7px] top-[24px] bottom-0 w-px bg-slate-100" />
                      )}
                      <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white" />
                      
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="text-sm font-black text-slate-800">{formatRp(p.amount)}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          {p.notes && (
                            <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                              {p.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="w-full mt-8 rounded-2xl bg-slate-900 text-white font-black py-4 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Modal({ open, title, children, onClose, maxWidth = 'max-w-2xl' }) {
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
