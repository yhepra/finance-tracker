import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import SearchableSelect from '../components/SearchableSelect'
import DateInputDMY from '../components/DateInputDMY'
import EditTransactionModalComponent from '../components/EditTransactionModal'
import * as XLSX from 'xlsx-js-style'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Edit2, 
  FileDown, 
  FileSpreadsheet, 
  Search,
  Calendar,
  X,
  Check
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

  const [accountId, setAccountId] = useState('') // Kept for some legacy logic or single selection if needed
  const [selectedAccountIds, setSelectedAccountIds] = useState([]) // Array for multiple selection
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return toInputDateString(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [to, setTo] = useState(() => {
    const d = new Date()
    return toInputDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  })
  const [reportSections, setReportSections] = useState({
    transactions: true,
    debtAndReceivable: true,
    accountSummary: true,
  })
  const [debts, setDebts] = useState([])
  const [receivables, setReceivables] = useState([])
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
    if (!from || !to) return
    setError('')
    setLoading(true)
    try {
      const fromDate = new Date(from)
      const year = !isNaN(fromDate.getTime()) ? fromDate.getFullYear() : new Date().getFullYear()
      const month = !isNaN(fromDate.getTime()) ? fromDate.getMonth() + 1 : new Date().getMonth() + 1

      const txParams = { take: 2000 }
      if (from) txParams.from = `${from}T00:00:00`
      if (to) txParams.to = `${to}T23:59:59`

      const [accRes, trxRes, debtRes, receivRes] = await Promise.all([
        axios.get('/api/accounts'),
        axios.get('/api/transactions', {
            params: {
              take: 5000, 
            },
        }),
        axios.get('/api/debtreceivables', { params: { kind: 'hutang' } }),
        axios.get('/api/debtreceivables', { params: { kind: 'piutang' } }),
      ])

      setAccounts(accRes.data?.data || [])
      setTransactions(trxRes.data?.data || [])
      setDebts(debtRes.data?.data || [])
      setReceivables(receivRes.data?.data || [])
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
      setDebts([])
      setReceivables([])
    } finally {
      setLoading(false)
    }
  }, [from, navigate, selectedAccountIds, to])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    const catMap = {}

    // Filter by selected accounts AND by date range
    const targetTransactions = (transactions || []).filter(t => {
      if (selectedAccountIds.length > 0 && !selectedAccountIds.includes(String(t.accountId))) return false
      const tDate = new Date(t.date)
      if (from && tDate < new Date(`${from}T00:00:00`)) return false
      if (to && tDate > new Date(`${to}T23:59:59`)) return false
      return true
    })

    targetTransactions.forEach(t => {
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
  }, [transactions, selectedAccountIds, from, to])

  const filteredTransactions = useMemo(() => {
    let list = transactions || []
    
    // Date filter
    list = list.filter(t => {
      const tDate = new Date(t.date)
      if (from && tDate < new Date(`${from}T00:00:00`)) return false
      if (to && tDate > new Date(`${to}T23:59:59`)) return false
      return true
    })

    // Account filter
    if (selectedAccountIds.length > 0) {
      list = list.filter(t => selectedAccountIds.includes(String(t.accountId)))
    }
    
    // Search filter
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(t => 
      (t.description || '').toLowerCase().includes(q) ||
      (t.categoryName || '').toLowerCase().includes(q) ||
      (t.accountName || accountNameById[String(t.accountId)] || '').toLowerCase().includes(q)
    )
  }, [transactions, selectedAccountIds, searchQuery, accountNameById, from, to])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  const accountSummaries = useMemo(() => {
    return (accounts || []).map(acc => {
      const accId = acc.id
      // Transactions BEFORE 'from' date to find start balance
      const transactionsBefore = (transactions || []).filter(t => 
        t.accountId === accId && 
        new Date(t.date) < new Date(`${from}T00:00:00`)
      )
      
      const prevIncome = transactionsBefore.filter(t => Number(t.type) === 1).reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const prevExpense = transactionsBefore.filter(t => Number(t.type) !== 1).reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const startBalance = Number(acc.balance || 0) + prevIncome - prevExpense

      // Transactions WITHIN period
      const transactionsInPeriod = (transactions || []).filter(t => {
        if (t.accountId !== accId) return false
        const tDate = new Date(t.date)
        if (from && tDate < new Date(`${from}T00:00:00`)) return false
        if (to && tDate > new Date(`${to}T23:59:59`)) return false
        return true
      })

      const income = transactionsInPeriod.filter(t => Number(t.type) === 1).reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const expense = transactionsInPeriod.filter(t => Number(t.type) !== 1).reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const closingBalance = startBalance + income - expense

      return {
        accountId: accId,
        name: acc.name,
        bankCode: acc.bankCode,
        startBalance,
        income,
        expense,
        closingBalance
      }
    })
  }, [accounts, transactions, from, to])

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const name = localStorage.getItem('auth_name') || 'User'
    const email = localStorage.getItem('auth_email') || ''
    
    // Style Constants
    const headerTitleStyle = { font: { bold: true, sz: 14, color: { rgb: "FF2563EB" } } }
    const sectionTitleStyle = { font: { bold: true, sz: 12, color: { rgb: "FF1E293B" } } }
    const tableHeaderStyle = { 
      font: { bold: true, color: { rgb: "FFFFFFFF" } }, 
      fill: { fgColor: { rgb: "FF2563EB" } },
      alignment: { vertical: "center", horizontal: "center" }
    }
    const totalRowStyle = { 
      font: { bold: true, color: { rgb: "FF0F172A" } }, 
      fill: { fgColor: { rgb: "FFF1F5F9" } } 
    }
    const currencyFormat = '"Rp"#,##0;[Red]-"Rp"#,##0'

    // Helper function to apply styles to a row
    const styleRow = (ws, rowIndex, colCount, style) => {
      for (let i = 0; i < colCount; i++) {
        const cellRef = XLSX.utils.encode_cell({r: rowIndex, c: i})
        if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' }
        ws[cellRef].s = style
      }
    }

    const applyNumberFormat = (ws, range, format) => {
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = ws[XLSX.utils.encode_cell({r: R, c: C})]
          if (cell && cell.t === 'n') cell.z = format
        }
      }
    }

    // Global Header for all sheets
    const headerTitle = [
      ["ALOKASI - Laporan Keuangan"],
      [`${name} (${email})`],
      [`Periode: ${formatDate(from)} - ${formatDate(to)}`],
      [] 
    ]

    // --- 1. Ringkasan Sheet ---
    const summaryToUse = selectedAccountIds.length > 0 
      ? accountSummaries.filter(s => selectedAccountIds.includes(String(s.accountId)))
      : accountSummaries

    const totalStartBalance = summaryToUse.reduce((sum, acc) => sum + (acc.startBalance || 0), 0)
    const totalIncome = summaryToUse.reduce((sum, acc) => sum + (acc.income || 0), 0)
    const totalExpense = summaryToUse.reduce((sum, acc) => sum + (acc.expense || 0), 0)
    const totalClosingBalance = summaryToUse.reduce((sum, acc) => sum + (acc.closingBalance || 0), 0)

    const ringkasanAOA = [
      ...headerTitle,
      ["RINGKASAN PERIODE"],
      ["Total Pemasukan", stats.income],
      ["Total Pengeluaran", stats.expense],
      ["Saldo Bersih", stats.net],
      [],
      ["RINGKASAN TIAP REKENING"],
      ["Rekening", "Saldo Awal", "Masuk", "Keluar", "Saldo Akhir"],
      ...summaryToUse.map(s => [
        (s.bankCode ? `[${s.bankCode}] ` : '') + (s.name || 'Unknown'),
        (s.startBalance || 0),
        (s.income || 0),
        (s.expense || 0),
        (s.closingBalance || 0)
      ]),
      ["TOTAL", totalStartBalance, totalIncome, totalExpense, totalClosingBalance],
      [],
      ["REKAP TRANSAKSI PER KATEGORI"],
      ["Kategori", "Nominal", "Persentase"],
      ...stats.categories.map(c => [
        c.name,
        c.value,
        stats.expense > 0 ? `${((c.value / stats.expense) * 100).toFixed(1)}%` : '0%'
      ])
    ]
    const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanAOA)
    wsRingkasan['!cols'] = [{wch: 35}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}]
    
    // Apply Styles to Ringkasan
    wsRingkasan['A1'].s = headerTitleStyle
    wsRingkasan['A5'].s = sectionTitleStyle
    wsRingkasan['A10'].s = sectionTitleStyle
    styleRow(wsRingkasan, 10, 5, tableHeaderStyle) // Ringkasan Rekening Header
    
    const summaryRowsCount = summaryToUse.length
    styleRow(wsRingkasan, 11 + summaryRowsCount, 5, totalRowStyle) // Total Row

    const catStartRow = 11 + summaryRowsCount + 2
    wsRingkasan[XLSX.utils.encode_cell({r: catStartRow, c: 0})].s = sectionTitleStyle
    styleRow(wsRingkasan, catStartRow + 1, 3, tableHeaderStyle) // Kategori Header
    
    // Format Currencies
    applyNumberFormat(wsRingkasan, {s: {r: 5, c: 1}, e: {r: 7, c: 1}}, currencyFormat) // Periode
    applyNumberFormat(wsRingkasan, {s: {r: 11, c: 1}, e: {r: 11 + summaryRowsCount, c: 4}}, currencyFormat) // Rekening
    applyNumberFormat(wsRingkasan, {s: {r: catStartRow + 2, c: 1}, e: {r: catStartRow + 2 + stats.categories.length, c: 1}}, currencyFormat) // Kategori

    XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan")

    // --- 2. Riwayat Transaksi Sheet ---
    if (reportSections.transactions) {
      const txAOA = [
        ...headerTitle,
        ["RIWAYAT TRANSAKSI"],
        ["Tanggal", "Rekening", "Deskripsi", "Kategori", "Tipe", "Nominal"],
        ...filteredTransactions.map(t => [
          formatDate(t.date),
          t.accountName || accountNameById[String(t.accountId)] || '-',
          t.description,
          t.categoryName || 'Belum Terkategori',
          Number(t.type) === 1 ? 'Pemasukan' : 'Pengeluaran',
          Number(t.amount) || 0
        ])
      ]
      const wsTx = XLSX.utils.aoa_to_sheet(txAOA)
      wsTx['!cols'] = [{wch: 15}, {wch: 25}, {wch: 40}, {wch: 25}, {wch: 15}, {wch: 20}]
      
      wsTx['A1'].s = headerTitleStyle
      wsTx['A5'].s = sectionTitleStyle
      styleRow(wsTx, 5, 6, tableHeaderStyle)
      applyNumberFormat(wsTx, {s: {r: 6, c: 5}, e: {r: 6 + filteredTransactions.length, c: 5}}, currencyFormat)
      
      XLSX.utils.book_append_sheet(wb, wsTx, "Riwayat Transaksi")
    }

    // --- 3. Hutang Sheet ---
    if (reportSections.debtAndReceivable && debts.length > 0) {
      const debtAOA = [
        ...headerTitle,
        ["DAFTAR HUTANG"],
        ["Pemberi Pinjaman", "Total Hutang", "Sudah Dibayar", "Sisa", "Status"],
        ...debts.map(d => [
          d.counterparty,
          d.amount,
          d.paidAmount,
          d.amount - d.paidAmount,
          d.status === 'paid' ? 'Lunas' : 'Belum Lunas'
        ])
      ]
      const wsDebt = XLSX.utils.aoa_to_sheet(debtAOA)
      wsDebt['!cols'] = [{wch: 30}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}]
      
      wsDebt['A1'].s = headerTitleStyle
      wsDebt['A5'].s = sectionTitleStyle
      styleRow(wsDebt, 5, 5, tableHeaderStyle)
      applyNumberFormat(wsDebt, {s: {r: 6, c: 1}, e: {r: 6 + debts.length, c: 3}}, currencyFormat)
      
      XLSX.utils.book_append_sheet(wb, wsDebt, "Hutang")
    }

    // --- 4. Piutang Sheet ---
    if (reportSections.debtAndReceivable && receivables.length > 0) {
      const receivAOA = [
        ...headerTitle,
        ["DAFTAR PIUTANG"],
        ["Peminjam", "Total Piutang", "Sudah Dibayar", "Sisa", "Status"],
        ...receivables.map(r => [
          r.counterparty,
          r.amount,
          r.paidAmount,
          r.amount - r.paidAmount,
          r.status === 'paid' ? 'Lunas' : 'Belum Lunas'
        ])
      ]
      const wsReceiv = XLSX.utils.aoa_to_sheet(receivAOA)
      wsReceiv['!cols'] = [{wch: 30}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}]
      
      wsReceiv['A1'].s = headerTitleStyle
      wsReceiv['A5'].s = sectionTitleStyle
      styleRow(wsReceiv, 5, 5, tableHeaderStyle)
      applyNumberFormat(wsReceiv, {s: {r: 6, c: 1}, e: {r: 6 + receivables.length, c: 3}}, currencyFormat)
      
      XLSX.utils.book_append_sheet(wb, wsReceiv, "Piutang")
    }

    XLSX.writeFile(wb, `Laporan_Alokasi_${from}_to_${to}.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const blue = [37, 99, 235] // #2563eb (True Blue)
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const name = localStorage.getItem('auth_name') || 'User'
    const email = localStorage.getItem('auth_email') || ''

    const addHeader = (data) => {
        // Logo right side (Icon + Text) - Realigned to be flush with right margin
        try {
            const logoX = pageWidth - 44
            doc.addImage("/logo-icon.png", "PNG", logoX, 10, 10, 10)
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(15, 23, 42) // Slate 900
            doc.text("ALOKASI", logoX + 12, 17.5)
        } catch (e) {}

        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 41, 59)
        doc.text("Laporan Keuangan", 14, 19)

        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text(`${name} (${email})`, 14, 25)
        
        doc.setDrawColor(226, 232, 240)
        doc.line(14, 28, pageWidth - 14, 28)
    }

    // Initial Header
    addHeader()

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text(`Periode: ${formatDate(from)} - ${formatDate(to)}`, 14, 40)
    
    // Stats summary card in PDF
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 45, pageWidth - 28, 25, 3, 3, 'F')
    
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(blue[0], blue[1], blue[2])
    doc.text("RINGKASAN PERIODE", 20, 52)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(71, 85, 105)
    doc.text(`Total Pemasukan: ${formatCurrency(stats.income)}`, 20, 58)
    doc.text(`Total Pengeluaran: ${formatCurrency(stats.expense)}`, pageWidth / 2, 58)
    doc.text(`Saldo Bersih: ${formatCurrency(stats.net)}`, 20, 64)

    let currentY = 80

    // Section 1: Ringkasan Rekening
    if (reportSections.accountSummary) {
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("Ringkasan Tiap Rekening", 14, currentY)
      
      const summaryToUse = selectedAccountIds.length > 0 
        ? accountSummaries.filter(s => selectedAccountIds.includes(String(s.accountId)))
        : accountSummaries

      const sumData = summaryToUse.map(s => {
        return [
          (s.bankCode ? `[${s.bankCode}] ` : '') + (s.name || 'Unknown'),
          formatCurrency(s.startBalance || 0),
          `+${formatCurrency(s.income || 0)}`,
          `-${formatCurrency(s.expense || 0)}`,
          formatCurrency(s.closingBalance || 0)
        ]
      })

      const totalStartBalance = summaryToUse.reduce((sum, acc) => sum + (acc.startBalance || 0), 0)
      const totalIncome = summaryToUse.reduce((sum, acc) => sum + (acc.income || 0), 0)
      const totalExpense = summaryToUse.reduce((sum, acc) => sum + (acc.expense || 0), 0)
      const totalClosingBalance = summaryToUse.reduce((sum, acc) => sum + (acc.closingBalance || 0), 0)

      autoTable(doc, {
        head: [['Rekening', 'Saldo Awal', 'Masuk', 'Keluar', 'Saldo Akhir']],
        body: sumData,
        foot: [['TOTAL', formatCurrency(totalStartBalance), `+${formatCurrency(totalIncome)}`, `-${formatCurrency(totalExpense)}`, formatCurrency(totalClosingBalance)]],
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillColor: blue, fontStyle: 'bold', textColor: 255 },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 30 }
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    // Section 1.5: Rekap Kategori
    if (stats.categories && stats.categories.length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(); currentY = 40; }
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("Rekap Transaksi per Kategori", 14, currentY)
      
      const catData = stats.categories.map(c => {
        const percentage = stats.expense > 0 ? ((c.value / stats.expense) * 100).toFixed(1) : 0
        return [
          c.name,
          formatCurrency(c.value),
          `${percentage}%`
        ]
      })

      autoTable(doc, {
        head: [['Kategori', 'Total Pengeluaran', 'Persentase']],
        body: catData,
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillColor: blue, fontStyle: 'bold', textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { top: 30 }
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    // Section 2: Transactions
    if (reportSections.transactions) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(); currentY = 40; }
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("Detail Riwayat Transaksi", 14, currentY)
      
      const tableData = filteredTransactions.map(t => [
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
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillColor: blue, fontStyle: 'bold', textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2.5 },
        margin: { top: 30 }
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    // Section 3: Hutang & Piutang
    if (reportSections.debtAndReceivable) {
      // Debt
      if (debts.length > 0) {
        if (currentY > pageHeight - 40) { doc.addPage(); addHeader(); currentY = 40; }
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 41, 59)
        doc.text("Daftar Hutang", 14, currentY)

        const debtData = debts.map(d => [
            d.counterparty,
            formatCurrency(d.amount),
            formatCurrency(d.paidAmount),
            formatCurrency(d.amount - d.paidAmount),
            d.status === 'paid' ? 'Lunas' : 'Belum Lunas'
        ])

        autoTable(doc, {
            head: [['Pemberi Pinjaman', 'Total Hutang', 'Sudah Dibayar', 'Sisa', 'Status']],
            body: debtData,
            startY: currentY + 5,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], fontStyle: 'bold', textColor: 255 },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { top: 30 }
        })
        currentY = doc.lastAutoTable.finalY + 15
      }

      // Receivable
      if (receivables.length > 0) {
        if (currentY > pageHeight - 40) { doc.addPage(); addHeader(); currentY = 40; }
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 41, 59)
        doc.text("Daftar Piutang", 14, currentY)

        const receivData = receivables.map(r => [
            r.counterparty,
            formatCurrency(r.amount),
            formatCurrency(r.paidAmount),
            formatCurrency(r.amount - r.paidAmount),
            r.status === 'paid' ? 'Lunas' : 'Belum Lunas'
        ])

        autoTable(doc, {
            head: [['Peminjam', 'Total Piutang', 'Sudah Dibayar', 'Sisa', 'Status']],
            body: receivData,
            startY: currentY + 5,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold', textColor: 255 },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { top: 30 }
        })
      }
    }

    // Add Pagination Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" })
        doc.text("Dicetak pada: " + new Date().toLocaleString('id-ID'), 14, pageHeight - 10)
    }

    doc.save(`Laporan_Alokasi_${from}_to_${to}.pdf`)
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pilih Rekening</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-2xl p-3 bg-slate-50/30">
                     <label className="flex items-center gap-3 cursor-pointer group pb-2 border-b border-slate-100 mb-2">
                       <input 
                         type="checkbox" 
                         checked={selectedAccountIds.length === 0} 
                         onChange={() => setSelectedAccountIds([])}
                         className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                       />
                       <span className="text-xs font-bold text-slate-700">Semua Rekening</span>
                     </label>
                     {accounts.map(a => (
                       <label key={a.id} className="flex items-center gap-3 cursor-pointer group">
                         <input 
                           type="checkbox" 
                           checked={selectedAccountIds.includes(String(a.id))} 
                           onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedAccountIds(p => [...p, String(a.id)])
                             } else {
                               setSelectedAccountIds(p => p.filter(id => id !== String(a.id)))
                             }
                           }}
                           className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                         />
                         <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                           {a.bankCode ? <span className="text-[10px] bg-slate-200 px-1 rounded mr-1.5 font-bold">{a.bankCode}</span> : null}
                           {a.name}
                         </span>
                       </label>
                     ))}
                  </div>
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
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Muat Dalam Report (PDF)</label>
                   <div className="space-y-2.5">
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input 
                         type="checkbox" 
                         checked={reportSections.accountSummary} 
                         onChange={e => setReportSections(p => ({...p, accountSummary: e.target.checked}))}
                         className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                       />
                       <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Ringkasan Tiap Rekening</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input 
                         type="checkbox" 
                         checked={reportSections.transactions} 
                         onChange={e => setReportSections(p => ({...p, transactions: e.target.checked}))}
                         className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                       />
                       <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Riwayat Transaksi</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input 
                         type="checkbox" 
                         checked={reportSections.debtAndReceivable} 
                         onChange={e => setReportSections(p => ({...p, debtAndReceivable: e.target.checked}))}
                         className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                       />
                       <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Hutang & Piutang</span>
                     </label>
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

                <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100/50">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Check size={14} className="font-bold" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Filter Aktif</span>
                    </div>
                    <p className="text-[10px] text-indigo-400 font-medium leading-relaxed">
                      Laporan akan diperbarui secara otomatis setiap kali Anda mengubah filter di atas.
                    </p>
                 </div>
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
        <EditTransactionModalComponent
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => setIsRangePickerOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden range-picker-modal animate-in zoom-in-95 slide-in-from-bottom-2 duration-150">
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
      <div className="flex justify-center custom-date-picker">
        <style>{`
          .custom-date-picker .react-datepicker {
            border: 1px solid #e2e8f0;
            border-radius: 1.5rem;
            font-family: inherit;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            overflow: hidden;
            background-color: #ffffff;
            padding: 0.5rem;
          }
          .custom-date-picker .react-datepicker__month-container {
            float: left;
            margin: 0 0.5rem;
          }
          .custom-date-picker .react-datepicker__header {
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
            padding: 1.25rem 0 0.5rem 0;
          }
          .custom-date-picker .react-datepicker__current-month {
            color: #0f172a;
            font-weight: 900;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
          }
          .custom-date-picker .react-datepicker__day-name {
            color: #94a3b8;
            font-weight: 800;
            font-size: 0.7rem;
            width: 2.25rem;
            margin: 0.2rem;
            text-transform: uppercase;
          }
          .custom-date-picker .react-datepicker__day {
            color: #334155;
            font-weight: 600;
            width: 2.25rem;
            height: 2.25rem;
            line-height: 2.25rem;
            margin: 0.2rem;
            border-radius: 999px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
          }
          .custom-date-picker .react-datepicker__day:hover:not(.react-datepicker__day--disabled) {
            background-color: #f1f5f9;
            color: #2563eb;
            transform: scale(1.1);
          }
          .custom-date-picker .react-datepicker__day--in-range {
            background-color: #eff6ff !important;
            color: #2563eb !important;
            border-radius: 0 !important;
            transform: none !important;
          }
          .custom-date-picker .react-datepicker__day--range-start {
            background-color: #4f46e5 !important;
            color: #ffffff !important;
            border-top-left-radius: 999px !important;
            border-bottom-left-radius: 999px !important;
            border-top-right-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            font-weight: 900;
            box-shadow: inset 2px 0 6px rgba(0,0,0,0.1);
          }
          .custom-date-picker .react-datepicker__day--range-end {
            background-color: #4f46e5 !important;
            color: #ffffff !important;
            border-top-right-radius: 999px !important;
            border-bottom-right-radius: 999px !important;
            border-top-left-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            font-weight: 900;
            box-shadow: inset -2px 0 6px rgba(0,0,0,0.1);
          }
          .custom-date-picker .react-datepicker__day--range-start.react-datepicker__day--range-end {
            border-radius: 999px !important;
            box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
            transform: scale(1.05) !important;
          }
          .custom-date-picker .react-datepicker__day--keyboard-selected {
            background-color: transparent;
            color: #334155;
          }
          .custom-date-picker .react-datepicker__navigation {
            top: 1.5rem;
            width: 2rem;
            height: 2rem;
            border-radius: 0.75rem;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .custom-date-picker .react-datepicker__navigation:hover {
            background: #f1f5f9;
          }
          .custom-date-picker .react-datepicker__navigation-icon::before {
            border-color: #64748b;
            border-width: 2px 2px 0 0;
            width: 8px;
            height: 8px;
            top: unset;
            left: unset;
          }
          .custom-date-picker .react-datepicker__navigation--previous {
            left: 1rem;
          }
          .custom-date-picker .react-datepicker__navigation--next {
            right: 1rem;
          }
        `}</style>
        <DatePicker
          inline
          monthsShown={2}
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setRange(update)}
          formatWeekDay={nameOfDay => nameOfDay.substring(0,2)}
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

function EditTransactionModal({ transaction, onClose, onUpdated }) {
  const [form, setForm] = useState({
    description: transaction.description || '',
    amount: String(Math.abs(Number(transaction.amount) || 0)),
    date: transaction.date ? String(transaction.date).slice(0, 10) : '',
    categoryId: transaction.categoryId ? String(transaction.categoryId) : '',
    type: String(transaction.type ?? 1),
  })
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get('/api/categories').then(res => {
      setCategories(res.data?.data || [])
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.description.trim()) { setError('Deskripsi wajib diisi.'); return }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) { setError('Nominal harus lebih dari 0.'); return }
    setSaving(true)
    try {
      await axios.put(`/api/transactions/${transaction.id}`, {
        description: form.description.trim(),
        amount,
        date: form.date ? `${form.date}T00:00:00` : undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        type: Number(form.type),
        accountId: transaction.accountId,
      })
      onUpdated()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || 'Gagal menyimpan.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="text-lg font-black text-slate-900 tracking-tight">Edit Transaksi</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipe</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                >
                  <option value="1">Pemasukan</option>
                  <option value="2">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Deskripsi</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nominal</label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kategori</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                >
                  <option value="">-- Tanpa Kategori --</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
