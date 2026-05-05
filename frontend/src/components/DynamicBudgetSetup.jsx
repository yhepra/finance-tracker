import React, { useReducer, useState, useEffect } from 'react';
import { RefreshCcw, Copy, PieChart, Sparkles, Info, Save, AlertTriangle, Wallet, Calendar, Check } from 'lucide-react';
import { Modal } from '../pages/Budgeting';
import axios from 'axios';

// --- Helper Functions ---
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number || 0);
};

const parseRupiah = (string) => {
  return Number(string.replace(/[^0-9]/g, ''));
};

const roundTwoDecimals = (num) => Math.round(num * 100) / 100;

// --- State Management (useReducer) ---
const initialState = {
  income: 0,
  categories: [],
};

function budgetReducer(state, action) {
  switch (action.type) {
    case 'SET_INCOME':
      return { ...state, income: action.payload.amount };

    case 'UPDATE_CATEGORY_NOMINAL':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? { ...c, nominal: action.payload.value } : c
        ),
      };

    case 'UPDATE_CATEGORY_PERCENTAGE':
      {
        const computedNominal = Math.round((action.payload.value / 100) * state.income);
        return {
          ...state,
          categories: state.categories.map((c) =>
            c.id === action.payload.id ? { ...c, nominal: computedNominal } : c
          ),
        };
      }

    case 'TOGGLE_CARRY_FORWARD':
      return {
        ...state,
        categories: state.categories.map((c) =>
          Number(c.id) === Number(action.payload.id) ? { ...c, carryForward: !c.carryForward } : c
        ),
      };

    case 'UPDATE_CATEGORY_NOTES':
      return {
        ...state,
        categories: state.categories.map((c) =>
          Number(c.id) === Number(action.payload.id) ? { ...c, notes: action.payload.value } : c
        ),
      };

    case 'SET_TYPE':
      return {
        ...state,
        categories: state.categories.map((c) =>
          Number(c.id) === Number(action.payload.id) ? { ...c, type: action.payload.type } : c
        ),
      };
    case 'SET_PERIOD':
      return {
        ...state,
        categories: state.categories.map((c) =>
          Number(c.id) === Number(action.payload.id) ? { ...c, period: action.payload.period } : c
        ),
      };
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.payload]
      };
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => Number(c.id) !== Number(action.payload.id))
      };
    case 'APPLY_TEMPLATE':
      return {
        ...state,
        categories: action.payload,
      };

    default:
      return state;
  }
}

// --- Component ---
export default function DynamicBudgetSetup({ expenseCategories = [], existingBudgets = [], onSetupComplete, selectedMonth, selectedYear }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  const [isSaved, setIsSaved] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize state with real data from props
  useEffect(() => {
    if (expenseCategories.length > 0) {
      const initCats = expenseCategories.map(cat => {
        // 1. First priority: OneTime budget that matches selected month/year
        const existingOneTime = existingBudgets.find(b => {
          if (Number(b.categoryId) !== Number(cat.id)) return false;
          if (Number(b.period) !== 4) return false; // Not OneTime
          if (!b.targetDate) return false;
          const d = new Date(b.targetDate);
          return (d.getMonth() + 1) === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
        });

        // 2. Second priority: Monthly/recurring budget (no date dependency)
        const existingMonthly = existingBudgets.find(b =>
          Number(b.categoryId) === Number(cat.id) && Number(b.period) !== 4
        );

        // Use whichever is found (OneTime for this month wins over Monthly)
        const existing = existingOneTime || existingMonthly;
        
        // Auto-detect type based on common names
        const name = cat.name.toLowerCase();
        let detectedType = 'Kebutuhan';
        if (name.includes('hiburan') || name.includes('hobi') || name.includes('lifestyle') || name.includes('belanja') || name.includes('kopi') || name.includes('jalan') || name.includes('nonton') || name.includes('keinginan')) {
          detectedType = 'Keinginan';
        } else if (name.includes('investasi') || name.includes('tabungan') || name.includes('dana darurat') || name.includes('asuransi') || name.includes('emas') || name.includes('saham') || name.includes('reksa dana') || name.includes('simpanan')) {
          detectedType = 'Tabungan';
        }

        return {
          id: cat.id,
          name: cat.name,
          nominal: existing ? Number(existing.amountLimit) : 0,
          carryForward: existing ? Boolean(existing.isRollover) : false,
          type: existing?.categoryType || detectedType, 
          period: existing ? existing.period : 1, // Default to Monthly (1)
          targetDate: existing ? existing.targetDate : null,
          originalBudgetId: existing ? existing.id : null,
          notes: existing ? existing.notes : ''
        };
      }).filter(cat => cat.originalBudgetId != null); // ONLY show existing initially
      dispatch({ type: 'APPLY_TEMPLATE', payload: initCats });

      // Restore income from backend for this period
      axios.get(`/api/budgets/income?month=${selectedMonth}&year=${selectedYear}`)
        .then(res => {
          if (res.data?.data) {
            dispatch({ type: 'SET_INCOME', payload: { amount: Number(res.data.data), month: selectedMonth, year: selectedYear } });
          } else {
             dispatch({ type: 'SET_INCOME', payload: { amount: 0, month: selectedMonth, year: selectedYear } });
          }
        })
        .catch(err => {
          console.error("Gagal load expected income dari backend", err);
          dispatch({ type: 'SET_INCOME', payload: { amount: 0, month: selectedMonth, year: selectedYear } });
        });
    }
  }, [expenseCategories, existingBudgets, selectedMonth, selectedYear]);

  // Derived state
  const totalAllocated = state.categories.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalPercentage = state.income > 0 ? (totalAllocated / state.income) * 100 : 0;
  const isOverBudget = totalPercentage > 100;

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  // --- Handlers for Quick Actions ---
  const handleReset = () => {
    const updated = state.categories.map((c) => ({ ...c, nominal: 0, carryForward: false }));
    dispatch({ type: 'APPLY_TEMPLATE', payload: updated });
  };

  const handleCopyLastMonth = () => {
    // Mockup data for last month
    const updated = state.categories.map((c) => ({ ...c, nominal: state.income * 0.15, carryForward: c.id === 'hiburan' }));
    dispatch({ type: 'APPLY_TEMPLATE', payload: updated });
  };

  const handle503020 = () => {
    // 50% Kebutuhan, 30% Keinginan, 20% Tabungan
    const kebutuhan = state.categories.filter((c) => c.type === 'Kebutuhan');
    const keinginan = state.categories.filter((c) => c.type === 'Keinginan');
    const tabungan = state.categories.filter((c) => c.type === 'Tabungan');

    let pKebutuhan = 50, pKeinginan = 30, pTabungan = 20;

    // Normalizing: If a group is missing, redistribute its weight to others
    // (e.g. if no Tabungan, distribute 20% into Kebutuhan/Keinginan proportionally)
    if (tabungan.length === 0) {
      pKebutuhan += 12; // 50 + approx 60% of 20
      pKeinginan += 8;  // 30 + approx 40% of 20
    }
    if (keinginan.length === 0) pKebutuhan += pKeinginan;
    if (kebutuhan.length === 0) pKeinginan += pKebutuhan;

    // If NO categories are mapped yet, alert
    if (state.categories.length === 0) {
        alert("Silakan tambah kategori pengeluaran terlebih dahulu.");
        return;
    }

    const updated = state.categories.map((c) => {
      let portion = 0;
      if (c.type === 'Kebutuhan' && kebutuhan.length > 0) portion = pKebutuhan / kebutuhan.length;
      if (c.type === 'Keinginan' && keinginan.length > 0) portion = pKeinginan / keinginan.length;
      if (c.type === 'Tabungan' && tabungan.length > 0) portion = pTabungan / tabungan.length;

      return { ...c, nominal: (portion / 100) * state.income, carryForward: false };
    });
    dispatch({ type: 'APPLY_TEMPLATE', payload: updated });
    
    if (tabungan.length === 0) {
      alert("Catatan: Anda belum memiliki kategori 'Tabungan'. Jatah 20% dialihkan sementara ke Kebutuhan & Keinginan.");
    }
  };

  const handleSmartSuggestion = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // Panggil AI dari backend dengan memberikan pemasukan dasar dan konteks bulan
      const res = await axios.post('/api/budgets/smart-suggest', { 
        income: state.income,
        month: selectedMonth,
        year: selectedYear
      });
      const suggestions = res.data.data; // array of BudgetSuggestionRow

      // Apply the suggestions to the state
      const updated = state.categories.map((c) => {
        const found = suggestions.find((s) => Number(s.categoryId) === Number(c.id));
        if (found && found.recommendedAmount) {
          return { ...c, nominal: found.recommendedAmount, carryForward: true, notes: found.reason || c.notes };
        }
        return { ...c, nominal: 0, carryForward: false };
      });
      // Append missing suggested categories
      suggestions.forEach(s => {
          if (!updated.some(c => Number(c.id) === Number(s.categoryId))) {
              const fullCat = expenseCategories.find(ec => ec.id === s.categoryId);
              if (fullCat && s.recommendedAmount) {
                  let detectedType = 'Kebutuhan';
                  if (fullCat.name.toLowerCase().includes('hiburan') || fullCat.name.toLowerCase().includes('hobi') || fullCat.name.toLowerCase().includes('keinginan')) detectedType = 'Keinginan';
                  else if (fullCat.name.toLowerCase().includes('investasi') || fullCat.name.toLowerCase().includes('tabungan')) detectedType = 'Tabungan';

                  updated.push({
                      id: fullCat.id,
                      name: fullCat.name,
                      nominal: s.recommendedAmount,
                      carryForward: true,
                      type: detectedType,
                      period: 4,
                      targetDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01T00:00:00`,
                      originalBudgetId: null,
                      notes: s.reason || ''
                  });
              }
          }
      });
      dispatch({ type: 'APPLY_TEMPLATE', payload: updated });
    } catch (err) {
      console.error('Gagal mendapatkan saran cerdas:', err);
      if (err.response?.data?.message) {
         if (err.response.data.message.includes("API key")) {
             alert("Saran Cerdas Gagal: Anda belum mengatur Gemini API Key di menu Settings.");
         } else {
             alert(`Saran Cerdas Gagal: ${err.response.data.message}`);
         }
      } else {
         alert("Saran Cerdas Gagal: Gagal terhubung ke backend.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // Save income to backend
      if (state.income >= 0) {
        await axios.post('/api/budgets/income', {
          month: Number(selectedMonth),
          year: Number(selectedYear),
          amount: state.income
        });
      }

      // Loop over configured categories that have > 0 nominal or an existing budget
      for (const cat of state.categories) {
        if (cat.nominal > 0 || cat.originalBudgetId) {
          const targetDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01T00:00:00`;
          const payload = {
            categoryId: Number(cat.id),
            amountLimit: Number(cat.nominal),
            period: 4, // 4: OneTime (Locked to this month)
            isRollover: Boolean(cat.carryForward),
            targetDate,
            categoryType: cat.type,
            notes: cat.notes || ''
          };
          
          if (cat.originalBudgetId && Number(cat.period) === 4) {
            // Existing OneTime budget for this month → update it directly
            await axios.put(`/api/budgets/${cat.originalBudgetId}`, {
              amountLimit: Number(cat.nominal),
              isRollover: Boolean(cat.carryForward),
              categoryType: cat.type,
              notes: cat.notes || ''
            });
          } else {
            // Either new or existing Monthly(recurring) budget → always POST as OneTime override for this month
            if (cat.nominal > 0) {
              await axios.post('/api/budgets', payload);
            }
          }
        }
      }
      
      setIsSaved(true);
      if (onSetupComplete) onSetupComplete();
    } catch (err) {
      console.error("Gagal menyimpan form dinamis:", err);
      alert("Gagal menyimpan. Cek console log.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full pb-32">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Setup Budget Dinamis</h1>
          <p className="text-slate-500 mt-1">Alokasikan target pengeluaran Anda dengan bantuan AI.</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-2 w-fit">
          <Calendar size={16} className="text-blue-600" />
          <span className="text-sm font-black text-blue-700">
            Target: {new Date(selectedYear, selectedMonth - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Income Input Card */}
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100 border border-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="relative z-10">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-blue-500" />
            Estimasi Pemasukan Bulanan
          </label>
          <div className="flex items-center">
            <span className="text-3xl font-bold text-slate-400 mr-4">Rp</span>
            <input
              type="text"
              value={new Intl.NumberFormat('id-ID').format(state.income)}
              onChange={(e) => dispatch({ type: 'SET_INCOME', payload: { amount: parseRupiah(e.target.value), month: selectedMonth, year: selectedYear } })}
              className="text-5xl font-black text-slate-900 bg-transparent border-b-2 border-slate-200 outline-none focus:border-blue-500 transition-colors w-full pb-2"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="relative group/tooltip">
          <button onClick={handleReset} className="w-full flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform"><RefreshCcw size={20} /></div>
            <span className="font-bold text-slate-700 text-sm">Mulai Kosong</span>
          </button>
          <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 p-4 bg-slate-800 text-white text-[11px] leading-relaxed rounded-2xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] pointer-events-none">
            <div className="font-bold mb-1 text-slate-300">Mulai Kosong</div>
            Mereset semua alokasi anggaran kategori menjadi Rp 0 untuk memulai perencanaan dari awal.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
          </div>
        </div>

        <div className="relative group/tooltip">
          <button onClick={handleCopyLastMonth} className="w-full flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-3xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm hover:shadow-md">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Copy size={20} /></div>
            <span className="font-bold text-slate-700 text-sm">Salin Bulan Lalu</span>
          </button>
          <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 p-4 bg-slate-800 text-white text-[11px] leading-relaxed rounded-2xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] pointer-events-none">
            <div className="font-bold mb-1 text-indigo-300">Salin Bulan Lalu</div>
            Mengambil data target anggaran yang Anda simpan pada bulan sebelumnya sebagai referensi awal.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
          </div>
        </div>

        <div className="relative group/tooltip">
          <button onClick={handle503020} className="w-full flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-3xl hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm hover:shadow-md">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><PieChart size={20} /></div>
            <span className="font-bold text-slate-700 text-sm">Template 50/30/20</span>
          </button>
          <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 p-4 bg-slate-800 text-white text-[11px] leading-relaxed rounded-2xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] pointer-events-none">
            <div className="font-bold mb-1 text-blue-300">Aturan 50/30/20</div>
            Membagi otomatis pemasukan: <br/>• 50% Kebutuhan Pokok <br/>• 30% Keinginan/Lifestyle <br/>• 20% Tabungan/Investasi.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
          </div>
        </div>

        <div className="relative group/tooltip">
          <button onClick={handleSmartSuggestion} disabled={isGenerating} className="w-full flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-3xl hover:bg-amber-50 hover:border-amber-200 transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none">
            <div className={`p-3 bg-amber-100 text-amber-600 rounded-2xl transition-transform ${isGenerating ? 'animate-spin' : 'group-hover:scale-110'}`}><Sparkles size={20} /></div>
            <span className="font-bold text-slate-700 text-sm">{isGenerating ? 'Menganalisis...' : 'Saran Cerdas AI'}</span>
          </button>
          <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 p-4 bg-slate-800 text-white text-[11px] leading-relaxed rounded-2xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] pointer-events-none">
            <div className="font-bold mb-1 text-amber-300">Saran Cerdas AI Gemini</div>
            AI menganalisis rata-rata pengeluaran asli Anda 3 bulan terakhir untuk memberikan rekomendasi limit yang paling pas.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-4 pb-8">
        {state.categories.map((category) => {
          const currentPercentage = state.income > 0 ? (category.nominal / state.income) * 100 : 0;

          return (
            <div key={category.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative">
              {/* Optional: Show Gemini Reason tooltip if exists */}
              {category.reason && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-200 to-amber-300 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles size={10} /> Saran AI
                  <div className="hidden group-hover:block absolute top-full right-0 mt-1 w-64 p-2 bg-slate-800 text-white font-normal rounded-lg text-xs z-50">
                    {category.reason}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                
                {/* Info & Toggle Area */}
                <div className="md:w-1/3 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${category.type === 'Kebutuhan' ? 'bg-rose-400' : category.type === 'Keinginan' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-slate-800 leading-none">{category.name}</span>
                        <div
                          className="text-[9px] font-black px-2 py-0.5 rounded-full border-none outline-none cursor-pointer bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => setCategoryToDelete(category)}
                        >
                          HAPUS
                        </div>
                      </div>
                      <select 
                        value={category.type}
                        onChange={(e) => dispatch({ type: 'SET_TYPE', payload: { id: category.id, type: e.target.value } })}
                        className="text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:text-blue-600 bg-transparent border-none p-0 outline-none cursor-pointer mt-1"
                      >
                        <option value="Kebutuhan">Kebutuhan (50%)</option>
                        <option value="Keinginan">Keinginan (30%)</option>
                        <option value="Tabungan">Tabungan (20%)</option>
                      </select>
                      <input 
                         type="text"
                         value={category.notes || ''}
                         onChange={(e) => dispatch({ type: 'UPDATE_CATEGORY_NOTES', payload: { id: category.id, value: e.target.value } })}
                         placeholder="Tambah catatan..."
                         className="mt-1.5 text-xs text-slate-500 bg-slate-50 border-none outline-none rounded p-1 w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Carry Forward Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer group w-max">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={category.carryForward}
                        onChange={() => dispatch({ type: 'TOGGLE_CARRY_FORWARD', payload: { id: category.id } })}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${category.carryForward ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${category.carryForward ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors flex items-center gap-1.5">
                      Bawa sisa bulan lalu
                      <div className="relative inline-flex group/tooltip">
                        <Info size={14} className="text-slate-400" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 text-center">
                          Jika diaktifkan, sisa anggaran riil bulan lalu akan ditambahkan ke batas anggaran ini.
                        </div>
                      </div>
                    </span>
                  </label>
                </div>

                {/* Controls Area (Slider, %, Nominal) */}
                <div className="md:w-2/3 flex flex-col lg:flex-row items-center gap-6">
                  
                  {/* Slider */}
                  <div className="w-full flex-1 relative flex items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="0.1"
                      value={currentPercentage}
                      onChange={(e) => dispatch({ type: 'UPDATE_CATEGORY_PERCENTAGE', payload: { id: category.id, value: Number(e.target.value) } })}
                      className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 relative z-10"
                      style={{
                        background: `linear-gradient(to right, #2563EB 0%, #3B82F6 ${currentPercentage}%, #F1F5F9 ${currentPercentage}%, #F1F5F9 100%)`
                      }}
                    />
                  </div>

                  {/* Inputs */}
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    {/* Percentage Input */}
                    <div className="relative w-24">
                      <input 
                        type="number"
                        value={roundTwoDecimals(currentPercentage)}
                        onChange={(e) => dispatch({ type: 'UPDATE_CATEGORY_PERCENTAGE', payload: { id: category.id, value: Number(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-8 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                    </div>

                    <span className="text-slate-300 font-bold">=</span>

                    {/* Nominal Input */}
                    <div className="relative flex-1 lg:w-44">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                      <input 
                        type="text"
                        value={new Intl.NumberFormat('id-ID').format(category.nominal)}
                        onChange={(e) => dispatch({ type: 'UPDATE_CATEGORY_NOMINAL', payload: { id: category.id, value: parseRupiah(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-right"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add Category Row */}
        <div className="flex items-center gap-4 py-4 px-6 bg-slate-50 border-t border-slate-100">
           <select 
              className="w-full text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg p-2 outline-none"
              onChange={(e) => {
                  if (e.target.value) {
                      const cid = Number(e.target.value);
                      const ec = expenseCategories.find(x => Number(x.id) === cid);
                      if (ec && !state.categories.some(x => Number(x.id) === cid)) {
                          let type = 'Kebutuhan';
                          if (ec.name.toLowerCase().includes('hiburan')) type = 'Keinginan';
                          
                          dispatch({ 
                              type: 'ADD_CATEGORY', 
                              payload: {
                                  id: ec.id,
                                  name: ec.name,
                                  nominal: 0,
                                  carryForward: false,
                                  type: type,
                                  period: 4,
                                  targetDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01T00:00:00`,
                                  originalBudgetId: null,
                                  notes: ''
                              }
                          });
                      }
                      e.target.value = "";
                  }
              }}
           >
              <option value="">+ Tambah Kategori Pengeluaran Baru</option>
              {expenseCategories.filter(ec => !state.categories.some(c => Number(c.id) === Number(ec.id))).map(ec => (
                 <option key={ec.id} value={ec.id}>{ec.name}</option>
              ))}
           </select>
        </div>
      </div>

      {/* Sticky Footer Tracker */}
      <div className="sticky bottom-0 z-40 -mx-8 px-8 pb-4 pt-12 pointer-events-none">
        {/* Solid gradient shadow for seamless blend with DashboardLayout */}
        <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pointer-events-none -z-10"></div>
        
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-6 flex flex-col lg:flex-row items-center gap-6 lg:gap-8 pointer-events-auto">
          
          {/* Progress Section */}
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Teralokasi</div>
                <div className={`text-2xl font-black ${isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatRupiah(totalAllocated)} <span className="text-base font-bold text-slate-400">/ {formatRupiah(state.income)}</span>
                </div>
              </div>
              <div className={`text-xl font-black ${isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
                {roundTwoDecimals(totalPercentage)}%
              </div>
            </div>
            
            {/* Progress Bar Track */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {/* Dynamic sections per category to show colorful progress */}
              {state.categories.map((c) => {
                const pct = state.income > 0 ? (c.nominal / state.income) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div 
                    key={c.id} 
                    style={{ width: `${pct}%` }} 
                    className={`h-full border-r border-white/20 ${c.type === 'Kebutuhan' ? 'bg-rose-500' : c.type === 'Keinginan' ? 'bg-amber-500' : 'bg-emerald-500'} transition-all`}
                  />
                );
              })}
              {/* Excess indicator if over 100% */}
              {isOverBudget && (
                <div className="h-full bg-red-600 flex-1 animate-pulse" />
              )}
            </div>

            {/* Warning Message */}
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-bold transition-opacity ${isOverBudget ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
               <AlertTriangle size={14} />
               Peringatan: Alokasi anggaran melebihi estimasi pemasukan Anda!
            </div>
          </div>

          {/* Action Section */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <button 
              onClick={handleSave}
              disabled={isSaving || state.categories.length === 0}
              className={`w-full lg:w-48 relative overflow-hidden flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none ${
                isSaved ? 'bg-emerald-500 shadow-emerald-500/30' : 
                isOverBudget ? 'bg-slate-900 shadow-slate-900/30' : 'bg-blue-600 shadow-blue-600/30'
              }`}
            >
              {isSaving ? 'Menyimpan...' : isSaved ? (
                 <><Check size={20} /> Tersimpan</>
              ) : (
                <><Save size={20} /> Simpan Anggaran</>
              )}
            </button>
          </div>

        </div>
      </div>

      <Modal
        open={!!categoryToDelete}
        title="Konfirmasi Hapus"
        onClose={() => setCategoryToDelete(null)}
      >
        <div className="space-y-6">
          <p className="text-slate-600 font-medium">
            Apakah Anda yakin ingin menghapus kategori <strong>{categoryToDelete?.name}</strong> dari setup bulan ini?
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
             <button
               type="button"
               onClick={() => setCategoryToDelete(null)}
               className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
             >
               Batal
             </button>
             <button
               type="button"
               onClick={() => {
                 dispatch({ type: 'REMOVE_CATEGORY', payload: { id: categoryToDelete.id } });
                 setCategoryToDelete(null);
               }}
               className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition-all"
             >
               Ya, Hapus
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
