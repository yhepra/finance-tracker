import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Mail } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/70 p-8">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight text-slate-900">
            Fin<span className="text-indigo-600">Track</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Lupa password? Masukkan email Anda untuk mendapatkan link reset.
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
              <Mail size={18} />
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Email akun Anda"
              required
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>

          <div className="pt-2 text-center text-sm text-slate-500">
            Ingat password Anda?{' '}
            <Link className="text-indigo-600 font-semibold hover:underline" to="/login">
              Kembali ke Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
