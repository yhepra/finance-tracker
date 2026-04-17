import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  const token = localStorage.getItem('auth_token')
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="text-6xl font-black tracking-tight text-slate-900">404</div>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
          Halaman belum tersedia
        </h1>
        <p className="mt-2 text-slate-500">
          Link yang kamu buka tidak ditemukan atau fitur ini belum dibuat.
        </p>

        <div className="mt-8">
          <Link
            to={token ? '/dashboard' : '/'}
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-10 py-4 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]"
          >
            {token ? 'Kembali ke Dashboard' : 'Kembali ke Beranda'}
          </Link>
        </div>
      </div>
    </div>
  )
}

