import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { Plus, Save, Trash2 } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import DateInputDMY from '../components/DateInputDMY';

const TRANSACTION_TYPES = [
  { value: 1, label: 'Pemasukan' },
  { value: 2, label: 'Pengeluaran' },
  { value: 3, label: 'Transfer Internal' },
  { value: 4, label: 'Bayar Hutang' },
];

function toInputDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function newTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRow() {
  return {
    rowId: newTempId(),
    date: toInputDateString(new Date()),
    accountId: '',
    description: '',
    amount: '',
    type: 2,
    categoryId: '',
  };
}

const ManualTransaction = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [rows, setRows] = useState(() => [createEmptyRow()]);

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const res = await axios.get('/api/accounts');
        setAccounts(res.data?.data || []);
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_email');
          navigate('/login', { replace: true });
          return;
        }
        setAccounts([]);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      setErrorMessage('');
      try {
        const res = await axios.get('/api/categories');
        const items = res.data?.data || res.data;
        setCategories(Array.isArray(items) ? items : []);
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_email');
          navigate('/login', { replace: true });
          return;
        }
        setCategories([]);
        setErrorMessage('Gagal memuat kategori. Coba refresh halaman.');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchAccounts();
    fetchCategories();
  }, [navigate]);

  useEffect(() => {
    const firstId = accounts[0]?.id;
    if (!firstId) return;
    setRows((prev) =>
      prev.map((r) => (r.accountId ? r : { ...r, accountId: String(firstId) })),
    );
  }, [accounts]);

  const categoriesByType = useMemo(() => {
    return categories.reduce((acc, c) => {
      const key = Number(c.type);
      acc[key] = acc[key] || [];
      acc[key].push(c);
      return acc;
    }, {});
  }, [categories]);

  const accountOptions = useMemo(() => {
    return accounts.map((a) => ({ value: String(a.id), label: a.name }));
  }, [accounts]);

  const typeOptions = useMemo(() => {
    return TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }));
  }, []);

  const categoryNameById = useMemo(() => {
    return categories.reduce((acc, c) => {
      acc[String(c.id)] = c.name;
      return acc;
    }, {});
  }, [categories]);

  const addRow = () => {
    const firstId = accounts[0]?.id;
    const row = createEmptyRow();
    row.accountId = firstId ? String(firstId) : '';
    setRows((prev) => [...prev, row]);
  };

  const removeRow = (rowId) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.rowId !== rowId);
      return next.length ? next : [createEmptyRow()];
    });
  };

  const updateRow = (rowId, patch) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const resetTable = () => {
    const firstId = accounts[0]?.id;
    const row = createEmptyRow();
    row.accountId = firstId ? String(firstId) : '';
    setRows([row]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const errors = [];
    rows.forEach((r, idx) => {
      const rowNumber = idx + 1;
      const normalizedAmount = Number(r.amount);
      if (!r.accountId) errors.push(`Baris ${rowNumber}: rekening wajib dipilih.`);
      if (!r.date) errors.push(`Baris ${rowNumber}: tanggal wajib diisi.`);
      if (!r.description.trim()) errors.push(`Baris ${rowNumber}: deskripsi wajib diisi.`);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        errors.push(`Baris ${rowNumber}: nominal harus angka dan lebih dari 0.`);
      }
    });

    if (errors.length) {
      setErrorMessage(errors.slice(0, 3).join(' '));
      return;
    }

    setIsSaving(true);
    try {
      const groups = rows.reduce((acc, r) => {
        const key = String(r.accountId);
        acc[key] = acc[key] || [];
        acc[key].push(r);
        return acc;
      }, {});

      const requests = Object.entries(groups).map(([accountId, groupRows]) => {
        const payload = groupRows.map((r) => {
          const name = r.categoryId ? categoryNameById[String(r.categoryId)] : '';
          return {
            id: newTempId(),
            date: `${r.date}T00:00:00`,
            description: r.description.trim(),
            amount: Number(r.amount),
            type: Number(r.type),
            suggestedCategoryId: r.categoryId ? Number(r.categoryId) : null,
            suggestedCategoryName: r.categoryId ? name || 'Belum Terkategori' : 'Belum Terkategori',
          };
        });

        return axios.post(`/api/transactions/confirm?accountId=${encodeURIComponent(accountId)}`, payload);
      });

      await Promise.all(requests);
      setSuccessMessage(`${rows.length} transaksi berhasil disimpan.`);
      resetTable();
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_email');
        navigate('/login', { replace: true });
        return;
      }
      setErrorMessage('Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h1 className="text-xl font-semibold text-slate-800">Transaksi Manual</h1>
            <p className="text-sm text-slate-500 mt-1">
              Input beberapa transaksi sekaligus, lalu simpan ke sistem.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {isLoadingAccounts ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Memuat daftar rekening...
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex items-center justify-between gap-4 flex-wrap">
                <div>Belum ada rekening. Buat rekening dulu di menu Input Saldo Awal.</div>
                <button
                  type="button"
                  onClick={() => navigate('/saldo')}
                  className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Ke Input Saldo Awal
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Isi nominal selalu positif (jenis transaksi menentukan arah).
              </p>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus size={18} />
                Tambah Baris
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider text-xs border-b">
                      <th className="p-3 pl-5 font-semibold w-48">Rekening</th>
                      <th className="p-3 pl-5 font-semibold w-40">Tanggal</th>
                      <th className="p-3 font-semibold w-56">Jenis</th>
                      <th className="p-3 font-semibold">Deskripsi</th>
                      <th className="p-3 font-semibold w-52">Kategori</th>
                      <th className="p-3 font-semibold text-right w-40">Nominal</th>
                      <th className="p-3 font-semibold text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.rowId} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="p-3 pl-5 align-top">
                          <SearchableSelect
                            value={r.accountId}
                            onChange={(v) => updateRow(r.rowId, { accountId: String(v) })}
                            options={accountOptions}
                            emptyLabel="-- Pilih Rekening --"
                            disabled={isLoadingAccounts || accounts.length === 0}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </td>
                        <td className="p-3 pl-5 align-top">
                          <DateInputDMY
                            value={r.date}
                            onChange={(v) => updateRow(r.rowId, { date: v })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <SearchableSelect
                            value={r.type}
                            onChange={(v) => {
                              const nextType = Number(v);
                              const allowed = categoriesByType[nextType] || [];
                              const stillValid = allowed.some((c) => String(c.id) === String(r.categoryId));
                              updateRow(r.rowId, {
                                type: nextType,
                                categoryId: stillValid ? r.categoryId : '',
                              });
                            }}
                            options={typeOptions}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={r.description}
                            onChange={(e) => updateRow(r.rowId, { description: e.target.value })}
                            placeholder={`Contoh: Makan siang (Baris ${idx + 1})`}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <SearchableSelect
                            value={r.categoryId}
                            onChange={(v) => updateRow(r.rowId, { categoryId: String(v) })}
                            options={(categoriesByType[Number(r.type)] || []).map((c) => ({
                              value: String(c.id),
                              label: c.name,
                            }))}
                            emptyLabel="-- Pilih Kategori --"
                            disabled={isLoadingCategories}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={r.amount}
                            onChange={(e) => updateRow(r.rowId, { amount: e.target.value })}
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(r.rowId)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            aria-label="Hapus baris"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetTable}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={isSaving}
              >
                Bersihkan
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <Save size={18} />
                {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManualTransaction;
