import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { User, Calendar, ArrowRight, Wallet } from 'lucide-react'

export default function Onboarding() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await axios.post('/api/auth/complete-onboarding', {
        fullName,
        dateOfBirth: dob || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Update local storage with new token and info
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('auth_name', res.data.name || '')
      localStorage.setItem('auth_onboarded', 'true')
      localStorage.setItem('auth_role', res.data.role || 'User')
      window.dispatchEvent(new Event('auth-updated'))
      
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal menyimpan data pribadi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 p-10">
          <div className="text-center mb-10">
            {/* Consistent Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Wallet size={20} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                Fin<span className="text-blue-600">Track</span>
              </span>
            </div>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                <User size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lengkapi Profil</h1>
            <p className="mt-2 text-slate-500 font-medium">
              Satu langkah lagi sebelum masuk ke dashboard cerdas Anda.
            </p>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={20} />
                </div>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  type="text"
                  placeholder="Misal: Yoga Hendrapratama"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Tanggal Lahir (Opsional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={20} />
                </div>
                <input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
                <button
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                {loading ? 'Menyimpan...' : 'Masuk ke Dashboard'}
                <ArrowRight size={20} />
                </button>
                
                <button
                type="button"
                onClick={() => {
                    localStorage.clear();
                    window.dispatchEvent(new Event('auth-updated'));
                    navigate('/register', { replace: true });
                }}
                className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                Gunakan akun lain
                </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed font-medium">
            Data Anda akan dienkripsi secara aman menggunakan teknologi AES-CBC kami sebelum disimpan ke database.
          </p>
        </div>
      </div>
    </div>
  )
}
