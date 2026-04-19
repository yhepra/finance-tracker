import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Eye, EyeOff, Lock, Mail, Wallet, ArrowRight, ShieldCheck, Cpu } from 'lucide-react'
import GoogleSignInButton from '../components/GoogleSignInButton'
import LegalPopup from '../components/LegalPopup'

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [legalOpen, setLegalOpen] = useState(false)
  const [legalType, setLegalType] = useState('terms')

  const openLegal = (type) => {
    setLegalType(type)
    setLegalOpen(true)
  }

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
      if (res.data.isOnboardingCompleted) navigate('/dashboard', { replace: true })
      else navigate('/onboarding', { replace: true })
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
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Next-Gen Wealth Management</span>
          </div>
          
          <h2 className="text-6xl font-black text-white tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
            Mulai<br/>
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">Transformasi</span><br/>
            Finansial Anda.
          </h2>
          
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-sm mb-12 animate-in fade-in slide-in-from-left-4 duration-700 delay-450">
            Bergabunglah dengan platform manajemen keuangan tercanggih yang dirancang untuk membantu Anda menguasai setiap aspek finansial Anda.
          </p>

          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-500">
            {[
              { icon: <ShieldCheck size={20} className="text-blue-400" />, label: 'Privasi data tanpa kompromi', desc: 'Enkripsi end-to-end standar bank' },
              { icon: <Cpu size={20} className="text-indigo-400" />, label: 'Otomasi bertenaga AI', desc: 'Scan rekening koran secara instan' },
              { icon: <Mail size={20} className="text-emerald-400" />, label: 'Keamanan multi-faktor', desc: 'Lindungi akun Anda dengan otentikasi lapis' },
            ].map((f, i) => (
              <div key={i} className="group flex items-start gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="mt-1 p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform duration-300">
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
            <span className="hover:text-slate-300 cursor-pointer">Privacy</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex flex-col justify-center items-center relative overflow-y-auto px-8 py-16 bg-white">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 p-8">
           <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-5 py-2.5 rounded-2xl ring-1 ring-blue-100 italic">
             Sudah punya akun? Masuk &rarr;
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Buat Akun Anda</h1>
            <p className="text-slate-500 font-medium leading-relaxed">Persiapkan masa depan finansial Anda mulai hari ini dengan cara yang cerdas.</p>
          </div>

          {error && (
            <div className="mb-8 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-5 text-sm text-red-700 font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                !
              </div>
              {error}
            </div>
          )}



          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Alamat Email</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-4.5 pl-12 pr-12 text-slate-900 font-semibold outline-none focus:border-blue-300 focus:bg-white focus:ring-[6px] focus:ring-blue-500/5 transition-all"
                    placeholder="Minimal 8 char"
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Konfirmasi</label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] py-4.5 pl-12 pr-12 text-slate-900 font-semibold outline-none focus:border-blue-300 focus:bg-white focus:ring-[6px] focus:ring-blue-500/5 transition-all"
                    placeholder="Ulangi"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
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
                    'Mendaftarkan Akun...'
                  ) : (
                    <>
                      Bergabung Sekarang
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </div>

            <p className="pt-4 text-center text-xs text-slate-400 font-medium leading-relaxed">
              Dengan mendaftar, Anda menyetujui{' '}
              <button type="button" onClick={() => openLegal('terms')} className="text-slate-600 underline">
                Syarat & Ketentuan
              </button>{' '}
              serta{' '}
              <button type="button" onClick={() => openLegal('privacy')} className="text-slate-600 underline">
                Kebijakan Privasi
              </button>{' '}
              kami.
            </p>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Atau pergunakan Google</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
          </div>
          <div className="mt-8">
            <GoogleSignInButton onCredential={onGoogleCredential} label="Lanjutkan dengan Google" />
          </div>


        </div>
      </div>

      <LegalPopup open={legalOpen} type={legalType} onClose={() => setLegalOpen(false)} />
    </div>
  )
}
