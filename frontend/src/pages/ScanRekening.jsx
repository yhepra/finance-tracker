import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import SearchableSelect from '../components/SearchableSelect';
import { Upload, FileText, Trash2, Save, AlertCircle, Loader2, Lock, CheckCircle2, Wallet } from 'lucide-react';

function newTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toInputDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function ScanRekening() {
  const navigate = useNavigate();

  const [step, setStep] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);

  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState('BCA');
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [categories, setCategories] = useState([]);

  // ... (other state vars)
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [previewData, setPreviewData] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(null);
  const [statementYear, setStatementYear] = useState(null);
  const [statementMonth, setStatementMonth] = useState(null);
  const [autoSavedMsg, setAutoSavedMsg] = useState('');
  const [processProgress, setProcessProgress] = useState(0);

  const numberLocale = localStorage.getItem('prefs_numberLocale') || 'id-ID';

  // BNI requires password
  const isBni = String(bankCode).toUpperCase() === 'BNI';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setErrorMessage('');
      try {
        const [banksRes, accountsRes, categoriesRes] = await Promise.all([
          axios.get('/api/banks?active=true'),
          axios.get('/api/accounts'),
          axios.get('/api/categories'),
        ]);

        if (!mounted) return;
        const bankRows = Array.isArray(banksRes?.data?.data) ? banksRes.data.data : [];
        setBanks(bankRows);

        const accRows = Array.isArray(accountsRes?.data?.data) ? accountsRes.data.data : [];
        setAccounts(accRows);

        const catRows = Array.isArray(categoriesRes?.data?.data) ? categoriesRes.data.data : [];
        setCategories(catRows);
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('auth_token');
          navigate('/login', { replace: true });
          return;
        }
        setErrorMessage('Gagal memuat data awal. Pastikan backend berjalan.');
      }
    };
    load();
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (isProcessing && step === 'upload') {
      setProcessProgress(0);
      interval = setInterval(() => {
        setProcessProgress((prev) => {
          if (prev >= 95) return 95;
          const stepSize = prev < 40 ? 4 : prev < 70 ? 2 : 0.5;
          return prev + stepSize;
        });
      }, 600);
    } else {
      setProcessProgress(0);
      if (interval) clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isProcessing, step]);

  useEffect(() => {
    if (accounts.length > 0 && bankCode) {
      const match = accounts.find(a => String(a.bankCode).toUpperCase() === String(bankCode).toUpperCase());
      if (match) {
        setAccountId(match.id);
      } else {
        setAccountId(null);
      }
    }
  }, [bankCode, accounts]);

  const bankOptions = useMemo(() => {
    const active = banks.filter((b) => b?.isActive !== false);
    return active.map((b) => ({
      value: b.code,
      label: b.name,
    }));
  }, [banks]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[String(c.id)] = c; });
    return map;
  }, [categories]);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData([]);
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(false);
    setOpeningBalance(null);
    setStatementYear(null);
    setStatementMonth(null);
    setAutoSavedMsg('');
  };

  const uploadToPreview = async (nextFile) => {
    if (!nextFile) return;
    setErrorMessage('');
    setSuccessMessage('');
    setOpeningBalance(null);
    setAutoSavedMsg('');

    const normalizedBank = String(bankCode || '').trim().toUpperCase();
    if (!accountId) {
      setErrorMessage(`Belum ada rekening/akun yang terhubung ke bank ${normalizedBank}. Silakan buat rekening baru atau edit rekening yang sudah ada di menu Rekening, lalu pastikan kolom bank sudah dipilih dengan benar.`);
      return;
    }
    if (!['BCA', 'BNI', 'SUPERBANK'].includes(normalizedBank)) {
      setErrorMessage('Bank belum didukung. Pilih BCA, BNI, atau Superbank.');
      return;
    }
    if (isBni && !pdfPassword.trim()) {
      setErrorMessage('Rekening koran BNI biasanya terenkripsi. Masukkan password PDF Anda (biasanya tanggal lahir: DDMMYYYY).');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File terlalu besar. Maksimal 10MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', nextFile);
      formData.append('bankCode', normalizedBank);
      if (pdfPassword.trim()) {
        formData.append('pdfPassword', pdfPassword.trim());
      }

      const res = await axios.post('/api/statement-scan/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 menit
      });

      const data = Array.isArray(res?.data?.data) ? res.data.data : [];
      setPreviewData(data.map((x) => ({ ...x, id: x?.id || newTempId() })));

      if (res.data.openingBalance != null) setOpeningBalance(res.data.openingBalance);
      if (res.data.statementYear != null) setStatementYear(res.data.statementYear);
      if (res.data.statementMonth != null) setStatementMonth(res.data.statementMonth);
      if (res.data.autoSavedBalance) setAutoSavedMsg(res.data.autoSavedBalance);

      setStep('preview');
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
        return;
      }
      const apiMessage = error?.response?.data?.message || error?.response?.data?.title;
      setErrorMessage(apiMessage || 'Gagal scan rekening. Pastikan Gemini API key sudah diisi di Settings > Integrasi > Gemini Vision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onPickFile = (picked) => {
    if (!picked) return;
    setFile(picked);
    uploadToPreview(picked);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (!String(f.name || '').toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya mendukung file PDF.');
      return;
    }
    onPickFile(f);
  };

  const handleFieldChange = (id, field, value) => {
    setPreviewData((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleChangeCategory = (id, categoryIdValue) => {
    const cat = categoryById[String(categoryIdValue)] || null;
    setPreviewData((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              suggestedCategoryId: cat ? Number(cat.id) : null,
              suggestedCategoryName: cat ? String(cat.name) : 'Belum Terkategori',
            }
          : item
      )
    );
  };

  const removeRow = (id) => {
    setPreviewData((prev) => prev.filter((item) => item.id !== id));
  };

  const submit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!accountId) { setErrorMessage(`Rekening/akun untuk ${bankCode} belum tersedia.`); return; }
    if (!previewData.length) { setErrorMessage('Tidak ada transaksi untuk disimpan.'); return; }

    const errors = [];
    previewData.forEach((t, idx) => {
      const rowNumber = idx + 1;
      const amount = Number(t.amount);
      const d = toInputDateString(new Date(t.date));
      if (!d) errors.push(`Baris ${rowNumber}: tanggal wajib diisi.`);
      if (!String(t.description || '').trim()) errors.push(`Baris ${rowNumber}: deskripsi wajib diisi.`);
      if (!Number.isFinite(amount) || amount <= 0) errors.push(`Baris ${rowNumber}: nominal harus lebih dari 0.`);
      if (![1, 2].includes(Number(t.type))) errors.push(`Baris ${rowNumber}: tipe transaksi tidak valid.`);
    });
    if (errors.length) { setErrorMessage(errors.slice(0, 3).join(' ')); return; }

    setIsProcessing(true);
    try {
      const payload = previewData.map((t) => {
        const d = toInputDateString(new Date(t.date));
        return {
          id: t.id || newTempId(),
          date: `${d}T00:00:00`,
          description: String(t.description || '').trim(),
          amount: Number(t.amount),
          type: Number(t.type),
          suggestedCategoryId: t.suggestedCategoryId != null ? Number(t.suggestedCategoryId) : null,
          suggestedCategoryName: String(t.suggestedCategoryName || 'Belum Terkategori'),
        };
      });

      await axios.post(`/api/transactions/confirm?accountId=${encodeURIComponent(accountId)}`, payload);
      setSuccessMessage(`${payload.length} transaksi berhasil disimpan.`);
      setStep('success');
      setTimeout(() => { reset(); }, 2200);
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
        return;
      }
      setErrorMessage('Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-800">Scan Rekening Koran</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-200 shadow-sm animate-pulse">
                Experimental
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Upload rekening koran PDF (BCA / BNI / Superbank) dan cek draf transaksi sebelum disimpan. Fitur ini masih dalam tahap pengembangan.
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                {successMessage}
              </div>
            )}

            {/* ── UPLOAD STEP ─────────────────────────────────── */}
            {step === 'upload' && (
              <div className="space-y-5">
                {/* Bank selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Bank</label>
                  <SearchableSelect
                    value={bankCode}
                    onChange={(v) => { setBankCode(String(v)); setPdfPassword(''); }}
                    options={
                      bankOptions.length
                        ? bankOptions
                        : [{ value: 'BCA', label: 'BCA' }, { value: 'BNI', label: 'BNI' }]
                    }
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Mendukung BCA, BNI, dan Superbank. Mandiri segera hadir.</p>
                </div>

                {/* Password field — only for BNI */}
                {isBni && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">Password PDF BNI</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Rekening koran BNI dienkripsi dengan password. Biasanya berupa <strong>tanggal lahir</strong> Anda dalam format <code className="bg-blue-100 px-1 rounded">DDMMYYYY</code> (contoh: <code className="bg-blue-100 px-1 rounded">15031990</code>).
                    </p>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        placeholder="Contoh: 15031990"
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm pr-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium hover:underline"
                      >
                        {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Drop zone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dokumen Rekening Koran (PDF)
                  </label>
                  <div
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-xl transition-colors ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="space-y-2 text-center">
                      {isProcessing ? (
                        <div className="flex flex-col items-center w-full max-w-[280px]">
                          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
                          <div className="text-sm font-semibold text-slate-800">Menganalisis PDF…</div>
                          <div className="text-xs text-slate-500 mb-4 text-center">
                            {isBni ? 'Mendekripsi lalu mengirim ke Gemini Vision…' : 'Mengirim ke Gemini Vision…'}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full transition-all duration-300 ease-out"
                              style={{ width: `${processProgress}%` }}
                            />
                          </div>
                          <div className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                            {Math.floor(processProgress)}%
                          </div>
                        </div>
                      ) : file ? (
                        <div className="flex flex-col items-center">
                          <FileText className="h-12 w-12 text-blue-500 mb-2" />
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button
                            type="button"
                            onClick={() => uploadToPreview(file)}
                            className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            <Upload className="mr-2" size={16} />
                            Proses Ulang
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                              <span>Pilih file</span>
                              <input
                                type="file"
                                accept=".pdf"
                                className="sr-only"
                                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">atau drag & drop PDF (maks 10MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW STEP ─────────────────────────────────── */}
            {step === 'preview' && (
              <div className="space-y-4">
                {/* Opening balance info card */}
                {openingBalance != null && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-start gap-3">
                    <Wallet size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-800">
                        Saldo Awal Terdeteksi — {MONTH_NAMES[(statementMonth ?? 1) - 1]} {statementYear}
                      </div>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">
                        Rp {new Intl.NumberFormat('id-ID').format(openingBalance)}
                      </div>
                      {autoSavedMsg ? (
                        <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {autoSavedMsg}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 mt-1">
                          Saldo awal ini akan dicatat otomatis. Pastikan akun rekening sudah dibuat di Settings.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 flex items-start">
                  <AlertCircle className="text-yellow-600 mr-3 mt-0.5" size={20} />
                  <div>
                    <div className="text-sm font-bold text-yellow-800">Draf Transaksi — {previewData.length} baris</div>
                    <div className="text-xs text-yellow-700 mt-1">
                      Cek dan edit transaksi sebelum submit. Hapus baris yang tidak relevan.
                    </div>
                  </div>
                </div>

                <div className="overflow-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs border-b">
                        <th className="p-3 font-semibold w-40">Tanggal</th>
                        <th className="p-3 font-semibold min-w-[320px]">Deskripsi</th>
                        <th className="p-3 font-semibold w-56">Kategori</th>
                        <th className="p-3 font-semibold w-44">Tipe</th>
                        <th className="p-3 font-semibold text-right w-40">Nominal</th>
                        <th className="p-3 font-semibold text-center w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((item) => {
                        const dateInput = toInputDateString(new Date(item.date));
                        return (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="date"
                                value={dateInput}
                                onChange={(e) => handleFieldChange(item.id, 'date', `${e.target.value}T00:00:00`)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="p-3">
                              <SearchableSelect
                                value={item.suggestedCategoryId != null ? String(item.suggestedCategoryId) : ''}
                                onChange={(v) => handleChangeCategory(item.id, String(v))}
                                options={[
                                  { value: '', label: 'Belum Terkategori' },
                                  ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                                ]}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-xs py-1.5 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                menuClassName="text-sm"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={Number(item.type)}
                                onChange={(e) => handleFieldChange(item.id, 'type', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                              >
                                <option value={1}>Pemasukan</option>
                                <option value={2}>Pengeluaran</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={Number(item.amount) || ''}
                                onChange={(e) => handleFieldChange(item.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-right"
                              />
                              <div className="mt-1 text-[11px] text-slate-400">
                                {Number(item.amount) ? new Intl.NumberFormat(numberLocale).format(Number(item.amount)) : ''}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!previewData.length && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                            Tidak ada transaksi terdeteksi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    disabled={isProcessing}
                  >
                    Upload Ulang
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={isProcessing || !previewData.length}
                    className="inline-flex items-center bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? 'Menyimpan…' : `Submit ${previewData.length} Transaksi`}
                    <Save size={18} className="ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* ── SUCCESS STEP ─────────────────────────────────── */}
            {step === 'success' && (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
                <div className="text-lg font-semibold text-slate-800">Transaksi tersimpan!</div>
                <div className="mt-1 text-sm text-slate-500">Kamu bisa cek hasilnya di menu Transaksi.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
