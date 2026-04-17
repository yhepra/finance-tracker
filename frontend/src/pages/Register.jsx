import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Eye, EyeOff, Lock, Mail, Wallet, ArrowRight, ShieldCheck, Cpu } from 'lucide-react'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      await axios.post('/api/auth/register', {
        email: normalizedEmail,
        password,
      })
      setRegisteredEmail(normalizedEmail)
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Register gagal (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-12 max-w-lg w-full">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Mail size={48} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Cek Email Anda</h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
            Kami telah mengirimkan link verifikasi ke <br/>
            <span className="font-bold text-blue-600 decoration-2 underline-offset-4">{registeredEmail}</span>. 
            Silakan klik link tersebut untuk mengaktifkan akun.
          </p>
          <div className="space-y-4">
            <Link to="/login" className="flex items-center justify-center gap-3 w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all hover:-translate-y-1 shadow-xl shadow-slate-200">
                Lanjut ke Login
                <ArrowRight size={20} />
            </Link>
            <button 
                onClick={() => setRegisteredEmail('')}
                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
                Gunakan email lain
            </button>
          </div>
          <div className="mt-12 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs text-slate-400">
            "Keamanan finansial Anda dimulai dengan identitas yang terverifikasi secara aman."
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex">
      {/* Left Panel - Premium Decorative */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden bg-slate-900 p-12">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-80 h-80 rounded-full bg-blue-600/20 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full bg-indigo-600/20 blur-[80px]"></div>
        </div>

        {/* Consistent Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Wallet size={20} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white">
            Fin<span className="text-blue-400">Track</span>
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
            Mulai<br/>
            <span className="text-blue-400">Transformasi</span><br/>
            Finansial Anda.
          </h2>
          <p className="mt-6 text-slate-400 font-medium leading-relaxed max-w-sm">
            Bergabunglah dengan platform manajemen keuangan tercanggih. Dari scan mutasi otomatis hingga enkripsi tingkat bank.
          </p>

          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: <ShieldCheck size={18} className="text-blue-400" />, label: 'Privasi data tanpa kompromi' },
              { icon: <Cpu size={18} className="text-blue-400" />, label: 'Otomasi bertenaga AI' },
              { icon: <Mail size={18} className="text-blue-400" />, label: 'Keamanan multi-faktor' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                {f.icon}
                <span className="text-sm font-bold text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600 font-mono z-10">
          &copy; {new Date().getFullYear()} FinTrack Personal
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Wallet size={20} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Fin<span className="text-blue-600">Track</span>
            </span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Buat Akun</h1>
            <p className="mt-2 text-slate-500 font-medium">Daftar sekarang untuk mulai mengelola keuangan.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Mail size={18} />
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-slate-900 font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Lock size={18} />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-11 pr-12 text-slate-900 font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="Min. 8 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Konfirmasi Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Lock size={18} />
                </div>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-11 pr-12 text-slate-900 font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="Ulangi password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? 'Mendaftarkan...' : 'Buat Akun Sekarang'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>

            <div className="pt-2 text-center text-sm text-slate-500 font-medium">
              Sudah punya akun?{' '}
              <Link className="text-blue-600 font-bold hover:underline" to="/login">
                Masuk Disini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
