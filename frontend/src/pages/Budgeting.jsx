import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { Trash2, X, BarChart2, Shuffle, Settings2, TrendingUp, TrendingDown } from 'lucide-react';
import DynamicBudgetSetup from '../components/DynamicBudgetSetup';

const PERIOD_OPTIONS = [
  { value: 1, label: 'Bulanan' },
  { value: 2, label: 'Mingguan' },
  { value: 3, label: 'Tahunan' },
  { value: 4, label: 'Sekali Saja' },
];

const formatCurrency = (value) => {
  const locale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
  return 'Rp ' + Number(value || 0).toLocaleString(locale);
};

const getProgressColor = (pct) => {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const formatPeriodLabel = (periodValue) => {
  const found = PERIOD_OPTIONS.find((p) => p.value === Number(periodValue));
  return found ? found.label : 'Bulanan';
};

// Modal component (shared, used by DynamicBudgetSetup too)
export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="text-lg font-black text-slate-900 tracking-tight">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function Budgeting() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [itemToDelete, setItemToDelete] = useState(null);

  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => String(now.getMonth() + 1));
  const [year, setYear] = useState(() => String(now.getFullYear()));

  const expenseCategories = useMemo(() => {
    return (categories || []).filter((c) => Number(c.type) === 2 || Number(c.type) === 4);
  }, [categories]);

  const handle401 = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    navigate('/login', { replace: true });
  }, [navigate]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [catsRes, budgetsRes, statusRes] = await Promise.all([
        axios.get('/api/categories'),
        axios.get('/api/budgets'),
        axios.get(`/api/budgets/status?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`),
      ]);
      setCategories(catsRes.data?.data || []);
      setBudgets(budgetsRes.data?.data || []);
      setStatuses(statusRes.data?.data || []);
    } catch (error) {
      if (error?.response?.status === 401) { handle401(); return; }
      setErrorMessage('Gagal memuat data. Coba refresh halaman.');
    } finally {
      setIsLoading(false);
    }
  }, [handle401, month, year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const deleteBudget = async (budgetId) => {
    setErrorMessage('');
    try {
      await axios.delete(`/api/budgets/${encodeURIComponent(budgetId)}`);
      await loadAll();
    } catch (error) {
      if (error?.response?.status === 401) { handle401(); return; }
      setErrorMessage('Gagal menghapus budget.');
    } finally {
      setItemToDelete(null);
    }
  };

  // Summary totals
  const totalBudgeted = statuses.reduce((acc, s) => acc + Number(s.effectiveLimit || 0), 0);
  const totalSpent = statuses.reduce((acc, s) => acc + Number(s.spent || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  return (
    <DashboardLayout>
      <div className="w-full">

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart2 size={16} />
            Pantau Realisasi
          </button>
          <button
            onClick={() => setActiveTab('dynamic')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'dynamic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shuffle size={16} />
            Setup Anggaran
          </button>
        </div>

        {/* ==================== TAB: PANTAU REALISASI (Read-Only) ==================== */}
        {activeTab === 'summary' ? (
          <div className="animate-in fade-in duration-200">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="text-sm font-black uppercase tracking-widest text-blue-700">Budgeting</div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">Pantau Realisasi Anggaran</div>
                <p className="text-sm text-slate-500 mt-1">Monitoring pengeluaran vs anggaran yang sudah ditetapkan.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Month/Year Filter */}
                <div className="flex gap-2">
                  <select value={month} onChange={(e) => setMonth(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const v = String(idx + 1);
                      return <option key={v} value={v}>{v.padStart(2, '0')}</option>;
                    })}
                  </select>
                  <select value={year} onChange={(e) => setYear(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const v = String(now.getFullYear() - 2 + idx);
                      return <option key={v} value={v}>{v}</option>;
                    })}
                  </select>
                </div>
                {/* Shortcut to Setup */}
                <button type="button" onClick={() => setActiveTab('dynamic')}
                  className="h-11 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                  <Settings2 size={16} />
                  Setup Anggaran
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Summary Cards */}
            {!isLoading && statuses.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Anggaran</div>
                  <div className="text-xl font-black text-slate-900">{formatCurrency(totalBudgeted)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Terpakai</div>
                  <div className={`text-xl font-black ${overallPct >= 100 ? 'text-red-600' : overallPct >= 70 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {formatCurrency(totalSpent)}
                  </div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${getProgressColor(overallPct)}`} style={{ width: `${overallPct}%` }} />
                  </div>
                </div>
                <div className={`rounded-2xl border shadow-sm p-5 ${totalRemaining < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Sisa Anggaran</div>
                  <div className={`text-xl font-black flex items-center gap-2 ${totalRemaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {totalRemaining < 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                    {formatCurrency(Math.abs(totalRemaining))}
                  </div>
                  {totalRemaining < 0 && <div className="text-xs font-bold text-red-500 mt-1">Melebihi anggaran!</div>}
                </div>
              </div>
            )}

            {/* Budget List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="text-sm font-black uppercase tracking-widest text-slate-600">Detail per Kategori</div>
                <div className="text-xs font-bold text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Aman</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>&gt;70%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Overbudget</span>
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-sm font-bold text-slate-500">Memuat...</div>
              ) : statuses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart2 size={28} className="text-blue-400" />
                  </div>
                  <div className="text-base font-black text-slate-800 mb-1">Belum ada anggaran bulan ini</div>
                  <p className="text-sm text-slate-500 mb-4">Buat anggaran terlebih dahulu melalui menu Setup Anggaran.</p>
                  <button type="button" onClick={() => setActiveTab('dynamic')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
                    <Settings2 size={16} /> Buka Setup Anggaran
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {statuses.map((s) => {
                    const pct = Number(s.percentage || 0);
                    const capped = Math.max(0, Math.min(100, pct));
                    const remaining = Number(s.effectiveLimit || 0) - Number(s.spent || 0);
                    const isOver = remaining < 0;
                    const linkedBudget = budgets.find((b) => Number(b.id) === Number(s.budgetId));
                    return (
                      <div key={s.budgetId} className="px-6 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Category Name + Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <div className="text-base font-black text-slate-900">{s.categoryName}</div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">
                                {formatPeriodLabel(s.period)}
                              </span>
                              {s.categoryType && (
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                                  s.categoryType === 'Kebutuhan' ? 'bg-rose-100 text-rose-700' :
                                  s.categoryType === 'Keinginan' ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>{s.categoryType}</span>
                              )}
                              {linkedBudget?.isRollover && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                                  Rollover
                                </span>
                              )}
                            </div>
                            {/* Spend Info */}
                            <div className="text-sm font-bold text-slate-600">
                              {formatCurrency(s.spent)}{' '}
                              <span className="text-slate-400 font-normal">dari</span>{' '}
                              {formatCurrency(s.effectiveLimit)}
                              <span className={`ml-2 font-black text-xs ${pct >= 100 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {pct.toFixed(1)}%
                              </span>
                              <span className={`ml-2 text-xs font-semibold ${isOver ? 'text-red-500' : 'text-slate-400'}`}>
                                {isOver
                                  ? `• Overbudget ${formatCurrency(Math.abs(remaining))}`
                                  : `• Sisa ${formatCurrency(remaining)}`}
                              </span>
                            </div>
                          </div>

                          {/* Delete only */}
                          <button type="button" onClick={() => setItemToDelete(s)}
                            className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all flex-shrink-0"
                            aria-label="Hapus" title="Hapus anggaran ini">
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 ${getProgressColor(pct)} rounded-full transition-all`} style={{ width: `${capped}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal open={!!itemToDelete} title="Konfirmasi Hapus Anggaran" onClose={() => setItemToDelete(null)}>
              <div className="space-y-6">
                <p className="text-slate-600 font-medium">
                  Apakah Anda yakin ingin menghapus anggaran untuk <strong>{itemToDelete?.categoryName}</strong>?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setItemToDelete(null)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all">
                    Batal
                  </button>
                  <button type="button" onClick={() => deleteBudget(itemToDelete.budgetId)}
                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition-all">
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </Modal>
          </div>

        ) : (
          /* ==================== TAB: SETUP ANGGARAN ==================== */
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <DynamicBudgetSetup
              expenseCategories={expenseCategories}
              existingBudgets={budgets}
              onSetupComplete={() => { loadAll(); setActiveTab('summary'); }}
              selectedMonth={month}
              selectedYear={year}
            />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
