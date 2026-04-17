import React from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { Calendar, Clock } from 'lucide-react'

export default function TagihanRutin() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-8">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                <Calendar size={48} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100">
                <Clock size={20} className="text-amber-500 animate-pulse" />
            </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Segera Hadir
        </h1>
        <p className="mt-4 text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
          Fitur <span className="font-semibold text-slate-800">Manajemen Tagihan Rutin</span> sedang kami siapkan untuk membantu Anda melacak cicilan, langganan bulanan, dan pengeluaran tetap secara otomatis.
        </p>
        
        <div className="mt-12">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-10 py-4 text-white font-bold hover:bg-slate-800 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-sm font-bold text-slate-900 mb-1 italic opacity-50">#Upcoming</div>
                <div className="font-bold text-slate-800">Pengingat Otomatis</div>
                <div className="text-xs text-slate-500 mt-2">Notifikasi sebelum jatuh tempo tagihan.</div>
            </div>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-sm font-bold text-slate-900 mb-1 italic opacity-50">#Upcoming</div>
                <div className="font-bold text-slate-800">Prediksi Saldo</div>
                <div className="text-xs text-slate-500 mt-2">Estimasi saldo sisa setelah semua tagihan terbayar.</div>
            </div>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-sm font-bold text-slate-900 mb-1 italic opacity-50">#Upcoming</div>
                <div className="font-bold text-slate-800">Laporan Komparasi</div>
                <div className="text-xs text-slate-500 mt-2">Bandingkan tagihan antar bulan dengan mudah.</div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
