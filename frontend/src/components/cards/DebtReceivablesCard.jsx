import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatRp = (value) => {
    const locale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(value);
};

const DebtReceivablesCard = ({ stats }) => {
    if (!stats) return null;

    const piutangData = [
        { name: 'Piutang', value: stats.totalReceivables ?? 0 },
        { name: 'Sisa', value: (stats.totalReceivables ?? 0) * 0.2 }, // Fake padding for chart visual
    ];

    const hutangData = [
        { name: 'Hutang', value: stats.totalDebts ?? 0 },
        { name: 'Sisa', value: (stats.totalDebts ?? 0) * 0.4 }, // Fake padding for chart visual
    ];

    const blueColors = ['#2563eb', '#eff6ff']; // Blue 600, Blue 50
    const redColors = ['#ef4444', '#fef2f2']; // Red 500, Red 50

    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] flex flex-col h-full border border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Hutang & Piutang</h3>
            
            <div className="flex-1 flex items-center justify-around">
                {/* Piutang (Receivables) */}
                <div className="flex flex-col items-center relative w-1/2">
                    <div className="h-32 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={piutangData}
                                    innerRadius={36}
                                    outerRadius={50}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {piutangData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={blueColors[index]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatRp(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Icon logic */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <TrendingUp className="text-blue-600" size={20} />
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Piutang (Diluar)</p>
                        <p className="text-blue-600 font-bold">{formatRp(stats.totalReceivables ?? 0)}</p>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-24 bg-slate-100"></div>

                {/* Hutang (Debts) */}
                <div className="flex flex-col items-center relative w-1/2">
                    <div className="h-32 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={hutangData}
                                    innerRadius={36}
                                    outerRadius={50}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {hutangData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={redColors[index]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatRp(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <TrendingDown className="text-red-500" size={20} />
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Hutang (Dibayar)</p>
                        <p className="text-red-500 font-bold">{formatRp(stats.totalDebts ?? 0)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebtReceivablesCard;
