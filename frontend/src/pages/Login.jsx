import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Eye, EyeOff, Lock, Mail, Wallet, ArrowRight } from 'lucide-react'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(localStorage.getItem('remember_email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(Boolean(localStorage.getItem('remember_email')))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onGoogleCredential = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/google', { credential })
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('auth_email', res.data.email)
      localStorage.setItem('auth_name', res.data.name || '')
      localStorage.setItem('auth_onboarded', res.data.isOnboardingCompleted ? 'true' : 'false')
      localStorage.setItem('auth_role', res.data.role || 'User')

      window.dispatchEvent(new Event('auth-updated'))
      if (rememberMe) localStorage.setItem('remember_email', String(res.data.email || '').trim().toLowerCase())
      else localStorage.removeItem('remember_email')

      if (res.data.isOnboardingCompleted) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Login Google gagal (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-stretch overflow-hidden">
      {/* Left Panel - Premium Decorative */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden bg-[#0A0F1D] p-16">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px]"></div>
          <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[80px]"></div>
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Logo Section */}
        <div className="flex items-center gap-3 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 ring-1 ring-white/20">
            <Wallet size={24} />
          </div>
          <span className="text-3xl font-black tracking-tighter text-white">
            Fin<span className="text-blue-400">Track</span>
          </span>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 mt-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Intelligent Finance</span>
          </div>
          
          <h2 className="text-6xl font-black text-white tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
            Kendali<br/>
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">Penuh</span> Atas<br/>
            Keuangan Anda.
          </h2>
          
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-sm mb-12 animate-in fade-in slide-in-from-left-4 duration-700 delay-450">
            AI-powered automation untuk scan mutasi BCA & BNI, enkripsi data tingkat enterprise, dan insight keuangan real-time.
          </p>

          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-500">
            {[
              { icon: '🔐', label: 'Keamanan Tingkat Bank', desc: 'Data dienkripsi AES-CBC at-rest' },
              { icon: '🤖', label: 'Integrasi Gemini AI', desc: 'Scan mutasi PDF secara otomatis' },
              { icon: '📊', label: 'Analitik Cerdas', desc: 'Dashboard analytics lintas akun' },
            ].map((f, i) => (
              <div key={i} className="group flex items-start gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="mt-1 p-2 rounded-xl bg-white/5 text-xl group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">{f.label}</div>
                  <div className="text-xs font-medium text-slate-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-12 animate-in fade-in duration-1000 delay-700">
          <span>&copy; {new Date().getFullYear()} FinTrack Personal</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Security</span>
            <span className="hover:text-slate-300 cursor-pointer">System Status</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center relative overflow-y-auto px-8 py-16 bg-white">
        {/* Subtle Link to Register */}
        <div className="absolute top-0 right-0 p-8">
           <Link to="/register" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-5 py-2.5 rounded-2xl ring-1 ring-blue-100 italic">
             Belum punya akun? Daftar Gratis &rarr;
           </Link>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <Wallet size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Fin<span className="text-blue-600">Track</span>
            </span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Selamat Datang</h1>
            <p className="text-slate-500 font-medium leading-relaxed">Silakan masuk untuk melanjutkan perjalanan finansial Anda.</p>
          </div>

          {error && (
            <div className="mb-8 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-5 text-sm text-red-700 font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-black">
                !
              </div>
              {error}
            </div>
          )}



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

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" size={18} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors italic">
                   Lupa password?
                </Link>
              </div>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-4.5 pl-12 pr-12 text-slate-900 font-semibold outline-none focus:border-blue-300 focus:bg-white focus:ring-[6px] focus:ring-blue-500/5 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group font-medium">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer h-5 w-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-0 focus:ring-offset-0 transition-all checked:bg-blue-600 checked:border-blue-600"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                Ingat perangkat ini
              </label>
            </div>

            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="group relative w-full bg-slate-900 text-white font-black py-5 rounded-[1.25rem] overflow-hidden transition-all hover:bg-slate-800 shadow-2xl shadow-slate-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    'Otentikasi...'
                  ) : (
                    <>
                      Masuk ke Akun
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Atau dengan Google</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
          </div>
          <div className="mt-8">
            <GoogleSignInButton onCredential={onGoogleCredential} />
          </div>
        </div>
      </div>
    </div>
  )
}
