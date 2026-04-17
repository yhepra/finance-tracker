import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, Sparkles } from 'lucide-react';
import axios from 'axios';
import SearchableSelect from '../SearchableSelect';

const QuickScanCard = () => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [banks, setBanks] = useState([]);
    const [bankCode, setBankCode] = useState('BCA');
    const [bankError, setBankError] = useState('');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setBankError('');
            try {
                const res = await axios.get('/api/banks?active=true');
                const data = Array.isArray(res?.data?.data) ? res.data.data : [];
                if (!mounted) return;
                setBanks(data);
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
    }, []);

    const selectedBank = useMemo(() => {
        return banks.find((x) => x?.code === bankCode) || null;
    }, [banks, bankCode]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleScan = async () => {
        if (!selectedFile) {
            alert("Silakan pilih atau drag file PDF/JPG terlebih dahulu.");
            return;
        }

        if (selectedBank && !selectedBank.isSupported) {
            alert("Format bank belum didukung. Pilih bank lain.");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('bankCode', bankCode);

            const response = await axios.post('/api/transactions/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Berhasil di-scan! ${response.data.data.length} transaksi ditemukan.`);
            setSelectedFile(null);
        } catch (error) {
            console.error("Upload error:", error);
            alert("Gagal mem-parsing file. Pastikan backend menyala dan kamu sudah login.");
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] flex flex-col h-full border border-slate-100">
            <div className="mb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">Pilih Bank</div>
                    {bankError ? (
                        <div className="text-xs text-red-600">{bankError}</div>
                    ) : null}
                </div>
                <div className="mt-2">
                    <SearchableSelect
                        value={bankCode}
                        onChange={(v) => setBankCode(String(v))}
                        options={
                            banks.length === 0
                                ? [{ value: 'BCA', label: 'BCA' }]
                                : banks
                                      .slice()
                                      .sort((a, b) => Number(b?.isSupported) - Number(a?.isSupported) || String(a?.name || '').localeCompare(String(b?.name || '')))
                                      .map((b) => ({
                                          value: b.code,
                                          label: `${b.name}${!b.isSupported ? ' (Belum didukung)' : ''}`,
                                          disabled: !b.isSupported,
                                      }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                </div>
            </div>
            
            <div 
                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 cursor-pointer">
                    <Sparkles className="text-indigo-500" size={24} />
                    {/* Additional cloud icon can be added if desired */}
                </div>
                <h4 className="font-bold text-slate-800 text-lg mb-1">
                    Upload Rekening Koran {selectedBank?.name ? selectedBank.name : ''}
                </h4>
                <p className="text-slate-500 text-sm mb-4">
                    {selectedFile ? `Terpilih: ${selectedFile.name}` : 'Drag & drop PDF atau JPG di sini'}
                </p>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                />
            </div>

            <button 
                onClick={handleScan}
                disabled={isUploading}
                className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
            >
                <Sparkles size={18} />
                {isUploading ? 'Memproses dengan AI...' : '⚡ Scan dengan AI'}
            </button>
        </div>
    );
};

export default QuickScanCard;
