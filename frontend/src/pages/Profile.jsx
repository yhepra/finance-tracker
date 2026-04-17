import React, { useState } from 'react'
import axios from 'axios'
import DashboardLayout from '../layouts/DashboardLayout'
import DateInputDMY from '../components/DateInputDMY'

export default function Profile() {
  const [fullName, setFullName] = useState(localStorage.getItem('auth_name') || '')
  const [dateOfBirth, setDateOfBirth] = useState(localStorage.getItem('auth_dob') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await axios.put('/api/auth/profile', { fullName, dateOfBirth: dateOfBirth || null })
      if (res?.data?.token) localStorage.setItem('auth_token', res.data.token)
      if (typeof res?.data?.email === 'string') localStorage.setItem('auth_email', res.data.email)
      localStorage.setItem('auth_name', res.data.name || '')
      localStorage.setItem('auth_dob', res.data.dateOfBirth || '')
      window.dispatchEvent(new Event('auth-updated'))
      setSuccess('Profil berhasil disimpan.')
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response
        ? apiMessage || `Gagal menyimpan (HTTP ${status}).`
        : 'Tidak bisa menghubungi server API. Pastikan backend jalan di http://localhost:5116'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Profil</h1>
        <p className="mt-1 text-slate-500">Atur nama dan tanggal lahir (untuk dokumen bank yang diproteksi).</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nama</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Contoh: Budi Santoso"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
            <DateInputDMY
              value={dateOfBirth}
              onChange={setDateOfBirth}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="dd/MM/yyyy"
            />
            <div className="mt-1 text-xs text-slate-500">Disimpan sebagai yyyy-mm-dd di sistem.</div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
