import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Token reset password tidak valid atau tidak ditemukan.')
    }
  }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) return
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/reset-password', { token, newPassword: password })
      setMessage(res.data.message || 'Password berhasil di reset.')
      setPassword('')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal reset password. Token mungkin kadaluarsa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight text-slate-900">
            Fin<span className="text-indigo-600">Track</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Masukkan password baru Anda.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock size={18} />
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Password Baru (min. 8 karakter)"
              required
              disabled={!token || !!message}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            disabled={loading || !token || !!message}
            type="submit"
            className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>

          <div className="pt-2 text-center text-sm text-slate-500">
            Ke halaman{' '}
            <Link className="text-indigo-600 font-semibold hover:underline" to="/login">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
