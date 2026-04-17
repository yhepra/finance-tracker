import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, Save, Trash2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import DateInputDMY from './DateInputDMY';

const TRANSACTION_TYPES = [
  { value: 1, label: 'Pemasukan' },
  { value: 2, label: 'Pengeluaran' },
  { value: 3, label: 'Transfer Internal' },
  { value: 4, label: 'Bayar Hutang' },
];

export default function EditTransactionModal({ transaction, onClose, onUpdated }) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    accountId: '',
    date: '',
    type: 2,
    categoryId: '',
    description: '',
    amount: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        accountId: String(transaction.accountId || ''),
        date: transaction.date ? transaction.date.split('T')[0] : '',
        type: Number(transaction.type) || 2,
        categoryId: transaction.categoryId ? String(transaction.categoryId) : '',
        description: transaction.description || '',
        amount: transaction.amount || ''
      });
    }
  }, [transaction]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          axios.get('/api/accounts'),
          axios.get('/api/categories')
        ]);
        setAccounts(accRes.data?.data || []);
        
        const items = catRes.data?.data || catRes.data;
        setCategories(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to fetch modal data', err);
      }
    };
    fetchData();
  }, []);

  const categoriesByType = useMemo(() => {
    return categories.reduce((acc, c) => {
      const key = Number(c.type);
      acc[key] = acc[key] || [];
      acc[key].push(c);
      return acc;
    }, {});
  }, [categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.accountId || !formData.date || !formData.description.trim() || Number(formData.amount) <= 0) {
      setError('Mohon lengkapi semua field dengan benar.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/api/transactions/${transaction.id}`, {
        ...formData,
        amount: Number(formData.amount),
        categoryId: formData.categoryId ? Number(formData.categoryId) : null
      });
      onUpdated();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengupdate transaksi.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    setIsLoading(true);
    try {
      await axios.delete(`/api/transactions/${transaction.id}`);
      onUpdated();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menghapus transaksi.';
      setError(msg);
      setIsLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Transaksi</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}
          
          <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rekening</label>
              <SearchableSelect
                value={formData.accountId}
                onChange={(v) => setFormData({ ...formData, accountId: String(v) })}
                options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <DateInputDMY
                  value={formData.date}
                  onChange={(v) => setFormData({ ...formData, date: v })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
                <SearchableSelect
                  value={formData.type}
                  onChange={(v) => {
                     const t = Number(v);
                     setFormData({ ...formData, type: t, categoryId: '' });
                  }}
                  options={TRANSACTION_TYPES}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <SearchableSelect
                value={formData.categoryId}
                onChange={(v) => setFormData({ ...formData, categoryId: String(v) })}
                options={(categoriesByType[formData.type] || []).map(c => ({ value: String(c.id), label: c.name }))}
                emptyLabel="-- Pilih Kategori --"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nominal</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </form>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
            title="Hapus Transaksi"
          >
            <Trash2 size={20} />
          </button>
          
          <div className="flex gap-3">
             <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
             >
                Batal
             </button>
             <button
                type="submit"
                form="edit-form"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
             >
                <Save size={18} />
                Simpan
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
