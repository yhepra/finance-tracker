import React, { useState } from 'react';
import { Download, Upload, AlertCircle } from 'lucide-react';
import UploadStatementModal from './UploadStatementModal';

const mockExcelData = {
  startingBalance: 2236093.92,
  incomes: [
    { id: 1, name: "Gaji (BNI 17)", amount: 6302500 },
    { id: 2, name: "Pesangon Sakura", amount: 8871121 },
    { id: 3, name: "Transfer dari Nivo", amount: 200000 }
  ],
  liabilities: [
    { id: 1, name: "Laptop", amount: 0 },
    { id: 2, name: "Galaxy Buds 3 FE", amount: 234482 }
  ],
  expenseAccounts: [
    {
      id: "bca",
      name: "BCA",
      expenses: [
        { id: 1, category: "Makan & Jajan", amount: 1217470, budget: 1500000 },
        { id: 2, category: "Belanja & Kebutuhan", amount: 886900, budget: 500000 }, // Overbudget
        { id: 3, category: "Transportasi", amount: 88900, budget: 150000 }
      ]
    },
    {
      id: "bni18",
      name: "BNI (18***)",
      expenses: [
        { id: 4, category: "Makan & Jajan", amount: 2671300, budget: 2500000 }, // Overbudget
        { id: 5, category: "Top Up E-Wallet", amount: 3250000, budget: 3250000, isInternal: true },
        { id: 6, category: "Biaya Transfer", amount: 36500, budget: 50000 }
      ]
    }
  ]
};

export default function MonthlyRecapTable() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // A. Pemasukan
  const totalIncome = mockExcelData.incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDanaA = mockExcelData.startingBalance + totalIncome;

  // B. Cicilan / Utang
  const totalLiabilities = mockExcelData.liabilities.reduce((acc, curr) => acc + curr.amount, 0);

  // C. Pengeluaran
  const totalExpense = mockExcelData.expenseAccounts.reduce((acc, account) => 
    acc + account.expenses.filter(e => !e.isInternal).reduce((subAcc, exp) => subAcc + exp.amount, 0)
  , 0);

  // SISA DANA (A - B - C)
  const sisaDana = totalDanaA - totalLiabilities - totalExpense;

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  };

  return (
    <>
      <div className="bg-white p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Arus Kas Bulanan (ZBB)</h2>
            <p className="text-gray-500 text-sm mt-1">Sistem Budgeting A - B - C = Sisa Dana</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Upload size={18} className="mr-2" /> Upload Mutasi PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-blue-900 text-white text-xs uppercase tracking-wider">
                <th className="p-4 rounded-tl-lg font-semibold w-1/3">Kategori / Akun</th>
                <th className="p-4 font-semibold">Realisasi (Aktual)</th>
                <th className="p-4 font-semibold text-blue-200">Rencana (Budget)</th>
                <th className="p-4 rounded-tr-lg font-semibold text-right">Status / Selisih</th>
              </tr>
            </thead>
            
            <tbody className="text-sm">
              {/* SALDO AWAL */}
              <tr className="bg-gray-100 border-b border-gray-200">
                <td className="p-4 font-bold text-gray-800">SALDO AWAL</td>
                <td className="p-4 font-bold text-gray-800" colSpan="3">{formatRupiah(mockExcelData.startingBalance)}</td>
              </tr>

              {/* I. PEMASUKAN */}
              <tr className="bg-blue-50/50">
                <td className="p-4 font-bold text-blue-900 uppercase" colSpan="4">I. PEMASUKAN</td>
              </tr>
              {mockExcelData.incomes.map(inc => (
                <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 pl-8 text-gray-600 font-medium">{inc.name}</td>
                  <td className="p-3 text-gray-800" colSpan="3">{formatRupiah(inc.amount)}</td>
                </tr>
              ))}
              <tr className="bg-blue-100/50 font-bold border-b-2 border-blue-200">
                <td className="p-4 text-blue-900">Total Dana ( A ) <span className="font-normal text-xs ml-2 text-blue-700">(Saldo Awal + Pemasukan)</span></td>
                <td className="p-4 text-blue-900" colSpan="3">{formatRupiah(totalDanaA)}</td>
              </tr>

              {/* II. CICILAN / UTANG */}
              <tr className="bg-orange-50/50 mt-4">
                <td className="p-4 font-bold text-orange-900 uppercase" colSpan="4">II. CICILAN / UTANG</td>
              </tr>
              {mockExcelData.liabilities.map(liab => (
                <tr key={liab.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 pl-8 text-gray-600 font-medium">{liab.name}</td>
                  <td className="p-3 text-gray-800" colSpan="3">{liab.amount > 0 ? formatRupiah(liab.amount) : '-'}</td>
                </tr>
              ))}
              <tr className="bg-orange-100/50 font-bold border-b-2 border-orange-200">
                <td className="p-4 text-orange-900">Total Utang ( B )</td>
                <td className="p-4 text-orange-900" colSpan="3">{formatRupiah(totalLiabilities)}</td>
              </tr>

              {/* III. PENGELUARAN */}
              <tr className="bg-red-50/50">
                <td className="p-4 font-bold text-red-900 uppercase flex items-center" colSpan="4">
                  III. PENGELUARAN 
                  <span className="ml-3 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Budget vs Aktual</span>
                </td>
              </tr>
              
              {mockExcelData.expenseAccounts.map(account => (
                <React.Fragment key={account.id}>
                  <tr>
                    <td className="p-3 pt-5 font-bold text-gray-800 italic" colSpan="4">{account.name}</td>
                  </tr>
                  {account.expenses.map(exp => {
                    const diff = (exp.budget || 0) - exp.amount;
                    const isOver = diff < 0;
                    
                    return (
                      <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 pl-8 flex items-center">
                          <span className={`${exp.isInternal ? 'text-gray-400' : 'text-gray-700'}`}>{exp.category}</span>
                          {exp.isInternal && <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">Transfer / Internal</span>}
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          {formatRupiah(exp.amount)}
                        </td>
                        <td className="p-3 text-gray-500">
                          {exp.budget ? formatRupiah(exp.budget) : '-'}
                        </td>
                        <td className="p-3 text-right">
                          {exp.isInternal ? (
                            <span className="text-gray-400 italic text-sm">Tidak Dihitung</span>
                          ) : exp.budget ? (
                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isOver ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {isOver && <AlertCircle size={12} className="mr-1" />}
                              {isOver ? 'Over: ' : 'Sisa: '}
                              {formatRupiah(Math.abs(diff))}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              
              <tr className="bg-red-100/50 font-bold border-b border-red-200">
                <td className="p-4 text-red-900">Total Pengeluaran ( C )</td>
                <td className="p-4 text-red-900" colSpan="3">{formatRupiah(totalExpense)}</td>
              </tr>

              {/* SISA DANA */}
              <tr><td colSpan="4" className="h-6"></td></tr>
              <tr className="bg-gray-900 text-white font-black text-lg shadow-lg">
                <td className="p-5 rounded-l-xl uppercase tracking-wider">IV. SISA DANA ( A - B - C )</td>
                <td className="p-5 rounded-r-xl" colSpan="3">{formatRupiah(sisaDana)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <UploadStatementModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </>
  );
}
