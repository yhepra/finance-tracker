import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Mail, Wallet } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() })
      setMessage(res.data.message || 'Link reset password telah dikirim ke email.')
      setEmail('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengirim email reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-stretch overflow-hidden">
      <div className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden bg-[#0A0F1D] p-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px]"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 ring-1 ring-white/20">
            <Wallet size={24} />
          </div>
          <span className="text-3xl font-black tracking-tighter text-white">
            Fin<span className="text-blue-400">Track</span>
          </span>
        </div>

        <div className="relative z-10 mt-12">
          <h2 className="text-5xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Reset<br />
            Password
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-sm">
            Masukkan email kamu. Kami akan kirim link untuk membuat password baru.
          </p>
        </div>

        <div className="relative z-10 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-12">
          <span>&copy; {new Date().getFullYear()} FinTrack Personal</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center relative overflow-y-auto px-8 py-16 bg-white">
        <div className="absolute top-0 right-0 p-8">
          <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-5 py-2.5 rounded-2xl ring-1 ring-blue-100 italic">
            Kembali ke Login &rarr;
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <Wallet size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Fin<span className="text-blue-600">Track</span>
            </span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Lupa Password</h1>
            <p className="text-slate-500 font-medium leading-relaxed">Masukkan email untuk menerima link reset password.</p>
          </div>

          {error ? (
            <div className="mb-8 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-5 text-sm text-red-700 font-bold flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-black">
                !
              </div>
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mb-8 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-5 text-sm text-emerald-700 font-bold flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-black">
                ✓
              </div>
              {message}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-4.5 pl-12 pr-4 text-slate-900 font-semibold outline-none focus:border-blue-300 focus:bg-white focus:ring-[6px] focus:ring-blue-500/5 transition-all"
                  placeholder="nama@provider.com"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.25rem] transition-all hover:bg-slate-800 shadow-2xl shadow-slate-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
