import React from 'react';
import { AlertCircle } from 'lucide-react';

const formatRp = (value) => {
    const locale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(value);
};

const ReconciliationCard = ({ stats }) => {
    if (!stats) return null;

    const diffIsNegative = (stats.difference ?? 0) < 0;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] flex flex-col h-full border border-slate-100">
            <h3 className="font-bold text-blue-900 text-lg mb-6">Status Saldo Bulan Ini</h3>
            
            <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-600 font-medium">Saldo Awal (Aktual)</span>
                    <span className="text-slate-900 font-bold text-lg">{formatRp(stats.actualStartBalance ?? 0)}</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-600 font-medium">Saldo Kalkulasi Sistem</span>
                    <span className="text-slate-900 font-bold text-lg">{formatRp(stats.systemCalculatedBalance ?? 0)}</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-600 font-semibold">Selisih</span>
                    <span className={`px-3 py-1 rounded-full font-bold text-sm ${diffIsNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {formatRp(stats.difference ?? 0)}
                    </span>
                </div>
            </div>

            {diffIsNegative && (
                <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm italic">
                    <AlertCircle size={16} className="text-amber-500" />
                    <span>Kenapa tidak sama? Ada transaksi terlewat.</span>
                </div>
            )}
        </div>
    );
};

export default ReconciliationCard;
