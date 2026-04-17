import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Eye, EyeOff, Lock, Mail, Wallet, ArrowRight } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(localStorage.getItem('remember_email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(Boolean(localStorage.getItem('remember_email')))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const res = await axios.post('/api/auth/login', {
        email: normalizedEmail,
        password,
      })
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('auth_email', res.data.email)
      localStorage.setItem('auth_name', res.data.name || '')
      localStorage.setItem('auth_onboarded', res.data.isOnboardingCompleted ? 'true' : 'false')
      localStorage.setItem('auth_role', res.data.role || 'User')
      
      window.dispatchEvent(new Event('auth-updated'))
      if (rememberMe) localStorage.setItem('remember_email', normalizedEmail)
      else localStorage.removeItem('remember_email')
      
      if (res.data.isOnboardingCompleted) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      if (err?.response?.data?.requireVerification) {
        setError('Email belum diverifikasi. Silakan cek inbox Anda.')
        return
      }
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Login gagal (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex">

      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden bg-slate-900 p-12">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-80 h-80 rounded-full bg-blue-600/20 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full bg-indigo-600/20 blur-[80px]"></div>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Wallet size={20} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white">
            Fin<span className="text-blue-400">Track</span>
          </span>
        </div>

        {/* Main Text */}
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
            Kendali<br/>
            <span className="text-blue-400">Penuh</span> Atas<br/>
            Keuangan Anda.
          </h2>
          <p className="mt-6 text-slate-400 font-medium leading-relaxed max-w-sm">
            AI-powered automation untuk scan mutasi BCA & BNI, enkripsi data tingkat enterprise, dan insight keuangan real-time dalam satu platform.
          </p>

          {/* Feature Chips */}
          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: '🔐', label: 'Data dienkripsi AES-CBC at-rest' },
              { icon: '🤖', label: 'Scan mutasi PDF via Gemini AI' },
              { icon: '📊', label: 'Dashboard analytics lintas akun' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <span>{f.icon}</span>
                <span className="text-sm font-bold text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-600 font-mono z-10">
          &copy; {new Date().getFullYear()} FinTrack Personal
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Selamat Datang</h1>
            <p className="mt-2 text-slate-500 font-medium">Masuk ke akun FinTrack Anda.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
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
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-11 pr-12 text-slate-900 font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="Min. 8 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-300 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200 accent-blue-600"
                />
                Ingat saya
              </label>
              <Link to="/forgot-password" className="text-sm font-bold text-blue-600 hover:underline">
                Lupa password?
              </Link>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? 'Verifikasi...' : 'Masuk'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>

            {/* Register Link */}
            <div className="pt-2 text-center text-sm text-slate-500 font-medium">
              Belum punya akun?{' '}
              <Link className="text-blue-600 font-bold hover:underline" to="/register">
                Daftar Gratis
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
