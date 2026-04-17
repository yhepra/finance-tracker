import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle2, XCircle, Loader2, ArrowRight, Wallet } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState(() => (token ? 'loading' : 'error')) // loading, success, error
  const [message, setMessage] = useState(() => (token ? '' : 'Token verifikasi tidak ditemukan.'))

  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const res = await axios.post('/api/auth/verify-email', { token })
        setStatus('success')
        setMessage(res.data.message)
      } catch (err) {
        setStatus('error')
        setMessage(err?.response?.data?.message || 'Gagal memverifikasi email.')
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 p-10 text-center">
            {/* Consistent Logo */}
            <div className="flex items-center justify-center gap-2 mb-10">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Wallet size={20} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                Fin<span className="text-blue-600">Track</span>
              </span>
            </div>
          {status === 'loading' && (
            <>
              <Loader2 size={64} className="mx-auto text-blue-600 animate-spin mb-6" />
              <h1 className="text-2xl font-black text-slate-900 mb-2">Memeriksa Token...</h1>
              <p className="text-slate-500">Mohon tunggu sebentar sementara kami memvalidasi akun Anda.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={64} className="mx-auto text-green-500 mb-6" />
              <h1 className="text-2xl font-black text-slate-900 mb-2">Verifikasi Berhasil!</h1>
              <p className="text-slate-500 mb-10">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all hover:-translate-y-1"
              >
                Lanjut ke Login
                <ArrowRight size={18} />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={64} className="mx-auto text-red-500 mb-6" />
              <h1 className="text-2xl font-black text-slate-900 mb-2">Verifikasi Gagal</h1>
              <p className="text-slate-500 mb-10">{message}</p>
              <div className="space-y-3">
                <Link
                    to="/register"
                    className="block w-full text-center bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all"
                >
                    Daftar Ulang
                </Link>
                <Link
                    to="/"
                    className="block w-full text-center text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
                >
                    Kembali ke Beranda
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
