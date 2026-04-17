import React from 'react';

const formatK = (value) => {
    const locale = localStorage.getItem('prefs_numberLocale') || 'id-ID';
    return 'Rp ' + (value / 1000).toLocaleString(locale) + 'k';
};

const BudgetProgressCard = ({ budgets }) => {
    if (!budgets || budgets.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] flex flex-col h-full border border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg mb-6">Pengeluaran vs Anggaran</h3>
            
            <div className="flex flex-col gap-6 flex-1 justify-center">
                {budgets.map((budget, index) => {
                    const hasBudget = (budget.budgetedAmount ?? 0) > 0;
                    const percentage = hasBudget
                        ? Math.min(100, Math.round(((budget.actualSpend ?? 0) / (budget.budgetedAmount ?? 1)) * 100))
                        : 0;
                    const isNearLimit = hasBudget && percentage >= 90;
                    
                    return (
                        <div key={index} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-slate-700 flex items-center gap-2">
                                    <span>{budget.icon}</span> {budget.categoryName}
                                </span>
                                <span className={isNearLimit ? 'text-red-500 font-bold' : 'text-slate-600'}>
                                    {formatK(budget.actualSpend ?? 0)} / {hasBudget ? formatK(budget.budgetedAmount ?? 0) : '-'}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full ${isNearLimit ? 'bg-red-500' : budget.colorCode}`} 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-6 flex justify-between text-xs text-slate-500 font-medium">
                <span>* Berdasarkan alokasi bulanan</span>
            </div>
        </div>
    );
};

export default BudgetProgressCard;
