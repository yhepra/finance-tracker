import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import SearchableSelect from '../components/SearchableSelect'
import DateInputDMY from '../components/DateInputDMY'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Edit2, 
  FileDown, 
  FileSpreadsheet, 
  Search,
  Calendar,
  X
} from 'lucide-react'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

function toInputDateString(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function Laporan() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false)

  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return toInputDateString(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [to, setTo] = useState(() => {
    const d = new Date()
    return toInputDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  })
  const numberLocale = localStorage.getItem('prefs_numberLocale') || 'id-ID'
  const dateFormat = localStorage.getItem('prefs_dateFormat') || 'DMY'

  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return '-'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    if (dateFormat === 'YMD') return `${y}-${m}-${dd}`
    if (dateFormat === 'MDY') return `${m}/${dd}/${y}`
    return `${dd}/${m}/${y}`
  }

  const accountNameById = useMemo(() => {
    return (accounts || []).reduce((acc, a) => {
      acc[String(a.id)] = a.name
      return acc
    }, {})
  }, [accounts])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [accRes, trxRes] = await Promise.all([
        axios.get('/api/accounts'),
        axios.get('/api/transactions', {
          params: {
            accountId: accountId ? Number(accountId) : undefined,
            from: from ? `${from}T00:00:00` : undefined,
            to: to ? `${to}T23:59:59` : undefined,
            take: 2000,
          },
        }),
      ])

      setAccounts(accRes.data?.data || [])
      setTransactions(trxRes.data?.data || [])
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
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [accountId, from, navigate, to])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    const catMap = {}

    transactions.forEach(t => {
      const amount = Math.abs(Number(t.amount) || 0)
      if (Number(t.type) === 1) {
        income += amount
      } else {
        expense += amount
        const catName = t.categoryName || 'Belum Terkategori'
        catMap[catName] = (catMap[catName] || 0) + amount
      }
    })

    const categories = Object.keys(catMap).map(name => ({
      name,
      value: catMap[name]
    })).sort((a, b) => b.value - a.value)

    return { income, expense, net: income - expense, categories }
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(t => 
      (t.description || '').toLowerCase().includes(q) ||
      (t.categoryName || '').toLowerCase().includes(q) ||
      (t.accountName || accountNameById[String(t.accountId)] || '').toLowerCase().includes(q)
    )
  }, [transactions, searchQuery, accountNameById])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  const exportExcel = () => {
    const data = transactions.map(t => ({
      Tanggal: formatDate(t.date),
      Rekening: t.accountName || accountNameById[String(t.accountId)] || '-',
      Deskripsi: t.description,
      Kategori: t.categoryName || 'Belum Terkategori',
      Tipe: Number(t.type) === 1 ? 'Pemasukan' : 'Pengeluaran',
      Nominal: Number(t.amount)
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Laporan")
    XLSX.writeFile(wb, `Laporan_FinTrack_${from}_to_${to}.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Laporan Transaksi Keuangan", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Periode: ${formatDate(from)} - ${formatDate(to)}`, 14, 28)
    doc.text(`Total Pemasukan: ${formatCurrency(stats.income)}`, 14, 34)
    doc.text(`Total Pengeluaran: ${formatCurrency(stats.expense)}`, 14, 40)
    doc.text(`Net Balance: ${formatCurrency(stats.net)}`, 14, 46)

    const tableData = transactions.map(t => [
      formatDate(t.date),
      t.accountName || accountNameById[String(t.accountId)] || '-',
      t.description,
      t.categoryName || 'Belum Terkategori',
      Number(t.type) === 1 ? 'Masuk' : 'Keluar',
      new Intl.NumberFormat(numberLocale).format(t.amount)
    ])

    autoTable(doc, {
      head: [['Tanggal', 'Rekening', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal']],
      body: tableData,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    })
    doc.save(`Laporan_FinTrack_${from}_to_${to}.pdf`)
  }

  return (
    <>
      <DashboardLayout>
        <div className="w-full relative pb-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Detail</h1>
              <p className="mt-1 text-slate-500 font-medium">Analisis mendalam pemasukan dan pengeluaran Anda.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-100 transition-all shadow-sm"
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} />
                Export Excel
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all shadow-sm"
                title="Export to PDF"
              >
                <FileDown size={16} />
                Export PDF
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Pemasukan</div>
              <div className="text-2xl font-black text-green-600">{formatCurrency(stats.income)}</div>
              <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase">Uang Masuk</div>
            </div>
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Pengeluaran</div>
              <div className="text-2xl font-black text-red-500">{formatCurrency(stats.expense)}</div>
              <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase">Uang Keluar</div>
            </div>
            <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-100">
              <div className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-1">Selisih (Net)</div>
              <div className="text-2xl font-black text-white">{formatCurrency(stats.net)}</div>
              <div className="mt-2 text-[10px] text-indigo-300 font-bold uppercase">Sisa Saldo</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Filter Card */}
            <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm h-fit">
              <div className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Filter Laporan</div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  load()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rekening</label>
                  <SearchableSelect
                    value={accountId}
                    onChange={(v) => setAccountId(String(v))}
                    options={accounts.map((a) => ({ value: String(a.id), label: a.name }))}
                    emptyLabel="Semua Rekening"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dari</label>
                    <DateInputDMY
                      value={from}
                      onChange={setFrom}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sampai</label>
                    <DateInputDMY
                      value={to}
                      onChange={setTo}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRangePickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all border border-indigo-100/50"
                  >
                    <Calendar size={14} />
                    Pilih Range via Kalender
                  </button>
                </div>

                <style>{`
                  .range-picker-modal .react-datepicker {
                    border: none;
                    font-family: inherit;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                  }
                  .range-picker-modal .react-datepicker__month-container {
                    width: 100%;
                    max-width: 320px;
                  }
                  .range-picker-modal .react-datepicker__day--selected, 
                  .range-picker-modal .react-datepicker__day--in-selecting-range, 
                  .range-picker-modal .react-datepicker__day--in-range {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    border-radius: 0.5rem;
                  }
                  .range-picker-modal .react-datepicker__day--range-start,
                  .range-picker-modal .react-datepicker__day--range-end {
                     background-color: #312e81 !important;
                  }
                  .range-picker-modal .react-datepicker__header {
                    background-color: transparent;
                    border: none;
                  }
                `}</style>
                <button type="submit" className="w-full rounded-2xl bg-indigo-600 text-white font-black py-3.5 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs mt-2">
                  Terapkan Filter
                </button>
              </form>
            </div>

            {/* Charts Card */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm font-black text-slate-900 uppercase tracking-wider">Breakdown Pengeluaran</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Berdasarkan Kategori</div>
              </div>
              
              <div className="h-[300px] w-full">
                {stats.categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="mb-2">Tidak ada data untuk grafik</div>
                    <div className="text-[10px] font-bold uppercase">Input pengeluaran untuk melihat breakdown</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-[32px] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-6 flex-1 min-w-[300px]">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                   <div className="font-black text-slate-900 uppercase tracking-widest text-xs">Riwayat Transaksi</div>
                </div>
                <div className="relative flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari deskripsi, kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <button type="button" onClick={load} className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:text-indigo-700 transition-colors">
                Refresh Data
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <div className="mt-4 text-sm font-bold text-slate-500 italic">Memproses laporan...</div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={24} />
                </div>
                <div className="text-sm font-bold text-slate-500">Transaksi tidak ditemukan</div>
                <div className="text-xs text-slate-400 mt-1">Gunakan kata kunci pencarian yang lain</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3 w-40">Tanggal</th>
                      <th className="text-left font-semibold px-5 py-3 w-48">Rekening</th>
                      <th className="text-left font-semibold px-5 py-3">Deskripsi</th>
                      <th className="text-left font-semibold px-5 py-3 w-56">Kategori</th>
                      <th className="text-right font-semibold px-5 py-3 w-40">Nominal</th>
                      <th className="text-center font-semibold px-3 py-3 w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((t) => {
                      const isIncome = Number(t.type) === 1
                      const amount = Number(t.amount) || 0
                      const formatted = new Intl.NumberFormat(numberLocale).format(amount)
                      const accountName = t.accountName || accountNameById[String(t.accountId)] || '-'
                      const categoryName = t.categoryName || 'Belum Terkategori'
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                            {formatDate(t.date)}
                          </td>
                          <td className="px-5 py-3 text-slate-800 font-medium">{accountName}</td>
                          <td className="px-5 py-3 text-slate-800">{t.description}</td>
                          <td className="px-5 py-3 text-slate-700">{categoryName}</td>
                          <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-slate-900'}`}>
                            {isIncome ? '+' : '-'}
                            {formatted}
                          </td>
                          <td className="px-3 py-3 text-center">
                             <button 
                               onClick={() => setEditingTransaction(t)}
                               className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                               title="Edit Transaksi"
                             >
                                <Edit2 size={16} />
                             </button>
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
      
      {editingTransaction && (
        <EditTransactionModal 
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onUpdated={() => {
            setEditingTransaction(null)
            load()
          }}
        />
      )}

      {/* Range Picker Modal */}
      {isRangePickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-300">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setIsRangePickerOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden range-picker-modal animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="text-xl font-black text-slate-900 tracking-tight">Pilih Rentang Laporan</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Klik tanggal mulai lalu tanggal akhir</div>
              </div>
              <button
                type="button"
                onClick={() => setIsRangePickerOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all font-bold"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <InternalRangePicker 
                initialFrom={from}
                initialTo={to}
                onApply={(start, end) => {
                  setFrom(toInputDateString(start))
                  setTo(toInputDateString(end))
                  setIsRangePickerOpen(false)
                }}
                onCancel={() => setIsRangePickerOpen(false)}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function InternalRangePicker({ initialFrom, initialTo, onApply, onCancel, formatDate }) {
  const [range, setRange] = useState([
    initialFrom ? new Date(initialFrom) : null,
    initialTo ? new Date(initialTo) : null
  ])
  const [startDate, endDate] = range

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <DatePicker
          inline
          monthsShown={2}
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setRange(update)}
        />
      </div>
      <div className="mt-8 w-full flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex gap-4">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dari</div>
            <div className="text-sm font-bold text-slate-700">{startDate ? formatDate(startDate) : '-'}</div>
          </div>
          <div className="h-8 w-px bg-slate-200 self-center" />
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sampai</div>
            <div className="text-sm font-bold text-slate-700">{endDate ? formatDate(endDate) : '-'}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 rounded-xl border border-slate-200 text-slate-500 font-bold py-3 hover:bg-slate-100 transition-all text-[10px] uppercase tracking-widest"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!startDate || !endDate}
            onClick={() => onApply(startDate, endDate)}
            className="px-8 rounded-xl bg-indigo-600 text-white font-black py-3 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  )
}
