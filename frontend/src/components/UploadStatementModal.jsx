import React, { useEffect, useMemo, useState } from 'react';
import { Upload, X, FileText, CheckCircle2, ChevronRight, Save, Trash2, Edit3, AlertCircle } from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function UploadStatementModal({ isOpen, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload', 'preview', 'success'
  const [file, setFile] = useState(null);
  const [bankCode, setBankCode] = useState('BCA');
  const [pdfPassword, setPdfPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [bankError, setBankError] = useState('');
  
  // Data for preview table
  const [previewData, setPreviewData] = useState([]);
  const numberLocale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
  const isBni = String(bankCode).toUpperCase() === 'BNI';

  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({ value: String(c.id), label: c.name }));
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[String(c.id)] = c;
    });
    return map;
  }, [categories]);

  const categoryByName = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[String(c.name || '').trim().toLowerCase()] = c;
    });
    return map;
  }, [categories]);

  const newTempId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const load = async () => {
      setBankError('');
      try {
        const [banksRes, accountsRes, categoriesRes] = await Promise.all([
          axios.get('/api/banks?active=true'),
          axios.get('/api/accounts'),
          axios.get('/api/categories'),
        ]);

        const data = Array.isArray(banksRes?.data?.data) ? banksRes.data.data : [];
        if (!mounted) return;
        setBanks(data);
        setAccounts(Array.isArray(accountsRes?.data?.data) ? accountsRes.data.data : []);
        setCategories(Array.isArray(categoriesRes?.data?.data) ? categoriesRes.data.data : []);

        const prefBankId = localStorage.getItem('prefs_defaultBankId');
        const preferredByPref =
          prefBankId ? data.find((x) => String(x?.id) === String(prefBankId))?.code : null;
        const supported = data.filter((x) => x?.isSupported);
        const preferred = preferredByPref || (supported[0] || data[0])?.code;
        if (preferred) setBankCode(preferred);
      } catch (err) {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.title;
        const status = err?.response?.status;
        const message = err?.response
          ? apiMessage || `Gagal memuat bank (HTTP ${status}).`
          : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116';
        if (!mounted) return;
        setBankError(message);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!accounts.length || !bankCode) return;
    const match = accounts.find((a) => String(a.bankCode).toUpperCase() === String(bankCode).toUpperCase());
    if (match) setAccountId(match.id);
    else setAccountId(null);
  }, [bankCode, accounts]);

  const bankOptions = useMemo(() => {
    return banks.slice().sort((a, b) => {
      const sa = a?.isSupported ? 1 : 0;
      const sb = b?.isSupported ? 1 : 0;
      return sb - sa || String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }, [banks]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadToPreview = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      if (!accountId) {
        throw new Error('Belum ada rekening/akun yang terhubung ke bank ini. Buat rekening dulu di menu Rekening.');
      }
      if (isBni && !pdfPassword.trim()) {
        throw new Error('Rekening koran BNI biasanya terenkripsi. Masukkan password PDF Anda (biasanya tanggal lahir: DDMMYYYY).');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankCode', bankCode);
      if (pdfPassword.trim()) formData.append('pdfPassword', pdfPassword.trim());

      const res = await axios.post('/api/statement-scan/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const normalized = rows.map((r) => {
        const suggestedName = String(r?.suggestedCategoryName || '').trim();
        const byName = suggestedName ? categoryByName[suggestedName.toLowerCase()] : null;
        const catId = r?.suggestedCategoryId ?? byName?.id ?? null;
        const catName = catId ? categoryById[String(catId)]?.name : suggestedName || 'Belum Terkategori';
        return {
          id: newTempId(),
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          suggestedCategoryId: catId,
          suggestedCategoryName: catName || 'Belum Terkategori',
        };
      });

      setPreviewData(normalized);
      setStep('preview');
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      alert(apiMessage || 'Gagal membaca PDF. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (id, field, value) => {
    setPreviewData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCategoryChange = (id, categoryIdValue) => {
    const c = categoryById[String(categoryIdValue)];
    if (!c) return;
    setPreviewData((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, suggestedCategoryId: c.id, suggestedCategoryName: c.name }
          : item
      )
    );
  };

  const removeRow = (id) => {
    setPreviewData(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmSave = async () => {
    setIsProcessing(true);
    
    try {
      if (!accountId) {
        throw new Error('Akun tidak valid.');
      }
      const payload = previewData.map((x) => ({
        date: x.date,
        description: x.description,
        amount: x.amount,
        type: x.type,
        suggestedCategoryId: x.suggestedCategoryId ?? null,
        suggestedCategoryName: x.suggestedCategoryName,
      }));
      await axios.post(`/api/transactions/confirm?accountId=${encodeURIComponent(accountId)}`, payload);
      setStep('success');
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      alert(apiMessage || 'Gagal menyimpan transaksi.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setPreviewData([]);
        setPdfPassword('');
        onClose();
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${step === 'preview' ? 'max-w-4xl' : 'max-w-md'} overflow-hidden transform transition-all flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-blue-50/80">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            {step === 'upload' && <Upload className="mr-2 text-blue-600" size={20} />}
            {step === 'preview' && <Edit3 className="mr-2 text-blue-600" size={20} />}
            {step === 'success' && <CheckCircle2 className="mr-2 text-green-600" size={20} />}
            {step === 'upload' ? 'Upload Mutasi (PDF)' : step === 'preview' ? 'Validasi Transaksi' : 'Berhasil'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Format Bank</label>
                {bankError ? (
                  <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {bankError}
                  </div>
                ) : null}
                <SearchableSelect
                  value={bankCode}
                  onChange={(v) => { setBankCode(String(v)); setPdfPassword(''); }}
                  options={
                    bankOptions.length === 0
                      ? [{ value: 'BCA', label: 'BCA' }]
                      : bankOptions.map((b) => ({
                          value: b.code,
                          label: `${b.name}${!b.isSupported ? ' (Belum didukung)' : ''}`,
                          disabled: !b.isSupported,
                        }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {isBni ? (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password PDF BNI</label>
                    <input
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder="DDMMYYYY"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">File PDF Laporan</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="space-y-1 text-center">
                    {file ? (
                      <div className="flex flex-col items-center cursor-pointer" onClick={() => document.getElementById('file-upload').click()}>
                        <FileText className="h-12 w-12 text-blue-500 mb-2" />
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <input id="file-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input id="file-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-0">
              <div className="bg-yellow-50 border-b border-yellow-100 p-4 px-6 flex items-start">
                <AlertCircle className="text-yellow-600 mr-3 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-yellow-800">Tinjau Sebelum Menyimpan</h4>
                  <p className="text-xs text-yellow-700 mt-1">Sistem kami telah mengekstrak transaksi berikut. Silakan ganti kategori atau hapus baris yang sekiranya tidak relevan (seperti transfer ke rekening sendiri).</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs border-b">
                    <th className="p-3 pl-6 font-semibold w-24">Tanggal</th>
                    <th className="p-3 font-semibold">Deskripsi Asli</th>
                    <th className="p-3 font-semibold">Tebakan Kategori</th>
                    <th className="p-3 font-semibold text-right">Nominal</th>
                    <th className="p-3 font-semibold text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 group">
                      <td className="p-3 pl-6 text-gray-500">{new Date(item.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={item.description} 
                          onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-800 font-medium placeholder-gray-400"
                        />
                      </td>
                      <td className="p-3">
                        <SearchableSelect
                          value={item.suggestedCategoryId ? String(item.suggestedCategoryId) : ''}
                          onChange={(v) => handleCategoryChange(item.id, String(v))}
                          options={categoryOptions}
                          emptyLabel="Belum Terkategori"
                          className="w-full bg-white border border-gray-200 text-gray-700 text-xs py-1.5 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          menuClassName="text-sm"
                        />
                      </td>
                      <td className="p-3 text-right font-medium">
                        <span className={item.type === 1 ? 'text-green-600' : 'text-gray-800'}>
                          {item.type === 1 ? '+' : '-'}{new Intl.NumberFormat(numberLocale).format(item.amount)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => removeRow(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce shadow-inner">
                <CheckCircle2 className="text-green-500 w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mt-4">Tersimpan Sempurna!</h4>
              <p className="text-gray-500 text-center max-w-xs">{previewData.length} transaksi telah direkam dan dihitung dalam Arus Kas Anda.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'success' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={step === 'preview' ? () => setStep('upload') : onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 mr-4 transition-colors"
            >
              Kembali
            </button>
            
            {step === 'upload' ? (
              <button
                onClick={handleUploadToPreview}
                disabled={!file || isProcessing}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center"
              >
                {isProcessing ? 'Membaca PDF...' : 'Ekstrak PDF'} <ChevronRight size={18} className="ml-1" />
              </button>
            ) : (
              <button
                onClick={handleConfirmSave}
                disabled={isProcessing}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-md disabled:opacity-50 flex items-center"
              >
                {isProcessing ? 'Menyimpan...' : 'Simpan Transaksi'} <Save size={18} className="ml-2" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
