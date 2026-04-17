import React from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Legend
} from 'recharts';

const YearlyCashFlowCard = ({ data }) => {
    const numberLocale = localStorage.getItem('prefs_numberLocale') || 'id-ID';

    const formatCurrency = (value) => {
        return new Intl.NumberFormat(numberLocale, {
            style: 'currency',
            currency: 'IDR',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(value);
    };

    const normalizedData = (data || []).map(item => ({
        month: item.month || item.Month || '',
        income: Number(item.income || item.Income || 0),
        expense: Number(item.expense || item.Expense || 0)
    }));

    return (
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm lg:col-span-2 min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Arus Kas Tahunan</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status Pemasukan & Pengeluaran {new Date().getFullYear()}</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-indigo-600" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Masuk</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-500" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Keluar</span>
                   </div>
                </div>
            </div>

            <div className="w-full h-[300px]">
                {normalizedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={normalizedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                tickFormatter={formatCurrency}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                formatter={(val) => [formatCurrency(val), ""]}
                            />
                            <Bar dataKey="income" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Pemasukan" />
                            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm italic">
                        Menunggu data keuangan...
                    </div>
                )}
            </div>
        </div>
    );
};

export default YearlyCashFlowCard;
