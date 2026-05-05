import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const fmt = (v) => {
  const locale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);
};

export default function MonthlyBudgetSummaryCard() {
  const navigate = useNavigate();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [budgetStatus, setBudgetStatus] = useState([]);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, incomeRes] = await Promise.all([
          axios.get(`/api/budgets/status?year=${year}&month=${month}`),
          axios.get(`/api/budgets/income?year=${year}&month=${month}`)
        ]);
        setBudgetStatus(statusRes.data?.data || []);
        setExpectedIncome(Number(incomeRes.data?.data) || 0);
      } catch (e) {
        console.error('Error loading monthly budget summary:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month, year]);

  if (loading) return null;

  const totalBudgeted = budgetStatus.reduce((acc, b) => acc + (b.amountLimit || b.effectiveLimit || 0), 0);
  const totalSpent = budgetStatus.reduce((acc, b) => acc + (b.spent || 0), 0);
  const remaining = expectedIncome > 0 ? expectedIncome - totalSpent : totalBudgeted - totalSpent;
  const spentPct = expectedIncome > 0
    ? Math.min(100, Math.round((totalSpent / expectedIncome) * 100))
    : (totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0);

  const isOverBudget = remaining < 0;

  const monthName = now.toLocaleString('id-ID', { month: 'long' });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Target size={20} className="text-indigo-600" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-base leading-tight">Anggaran Bulan Ini</div>
            <div className="text-xs font-medium text-slate-400">{monthName} {year}</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/budget')}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Kelola <ChevronRight size={14} />
        </button>
      </div>

      {/* Expected Income */}
      {expectedIncome > 0 && (
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estimasi Pemasukan</div>
          <div className="font-black text-slate-800 text-sm">{fmt(expectedIncome)}</div>
        </div>
      )}

      {/* Progress Bar */}
      {(totalBudgeted > 0 || totalSpent > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Terpakai</span>
            <span className={`text-xs font-black ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
              {fmt(totalSpent)} <span className="font-normal text-slate-400">/ {fmt(expectedIncome || totalBudgeted)}</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : spentPct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-bold flex items-center gap-1 ${isOverBudget ? 'text-red-500' : 'text-emerald-600'}`}>
              {isOverBudget ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {isOverBudget ? `Overbudget ${fmt(Math.abs(remaining))}` : `Sisa ${fmt(remaining)}`}
            </span>
            <span className={`text-xs font-black ${isOverBudget ? 'text-red-500' : spentPct >= 80 ? 'text-amber-500' : 'text-indigo-600'}`}>
              {spentPct}%
            </span>
          </div>
        </div>
      )}

      {/* Top categories */}
      {budgetStatus.length > 0 && (
        <div className="flex flex-col gap-2">
          {budgetStatus.slice(0, 4).map((b, i) => {
            const pct = b.effectiveLimit > 0 ? Math.min(100, Math.round((b.spent / b.effectiveLimit) * 100)) : 0;
            const over = b.spent > b.effectiveLimit && b.effectiveLimit > 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="text-xs font-bold text-slate-600 w-28 truncate">{b.categoryName}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${over ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={`text-[10px] font-black w-9 text-right ${over ? 'text-red-500' : 'text-slate-500'}`}>{pct}%</div>
              </div>
            );
          })}
          {budgetStatus.length > 4 && (
            <div className="text-xs text-slate-400 font-medium text-center mt-1">
              +{budgetStatus.length - 4} kategori lainnya
            </div>
          )}
        </div>
      )}

      {budgetStatus.length === 0 && (
        <div className="text-center py-4">
          <div className="text-xs text-slate-400 font-medium mb-2">Belum ada anggaran bulan ini</div>
          <button
            onClick={() => navigate('/budget')}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Setup Anggaran →
          </button>
        </div>
      )}
    </div>
  );
}
