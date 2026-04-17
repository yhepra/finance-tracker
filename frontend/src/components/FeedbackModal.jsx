import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { MessageSquare, Star, X } from 'lucide-react'

const MAX_COMMENT = 500

function sanitizeComment(input) {
  const s = String(input || '')
  return s.replace(/</g, '').replace(/>/g, '').trim()
}

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [categoryUi, setCategoryUi] = useState('Bug')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('input') // 'input', 'success'

  const categoryApi = useMemo(() => {
    if (categoryUi === 'Bug') return 'Bug'
    if (categoryUi === 'Saran') return 'FeatureRequest'
    return 'General'
  }, [categoryUi])

  useEffect(() => {
    if (!isOpen) return
    setRating(0)
    setHoverRating(0)
    setCategoryUi('Bug')
    setComment('')
    setIsSubmitting(false)
    setError('')
    setStep('input')
  }, [isOpen])

  const canSubmit = useMemo(() => {
    const cleaned = sanitizeComment(comment)
    if (rating <= 0) return false
    if (rating < 3 && cleaned.length === 0) return false
    if (cleaned.length > MAX_COMMENT) return false
    return true
  }, [comment, rating])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!canSubmit) return

    const cleaned = sanitizeComment(comment)
    if (rating < 3 && cleaned.length === 0) {
      setError('Komentar wajib diisi jika rating di bawah 3.')
      return
    }
    if (cleaned.length > MAX_COMMENT) {
      setError('Komentar maksimal 500 karakter.')
      return
    }

      setIsSubmitting(true)
      try {
        await axios.post('/api/feedback', {
          rating,
          category: categoryApi,
          comment: cleaned.length ? cleaned : null,
        })
        setStep('success')
        setTimeout(() => {
          onClose()
        }, 2200)
      } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title
      const status = err?.response?.status
      const message = err?.response ? apiMessage || `Gagal mengirim feedback (HTTP ${status}).` : 'Tidak bisa menghubungi server API.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-blue-50/80">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={20} />
            Feedback
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Tutup"
          >
            <X size={22} />
          </button>
        </div>

        {step === 'input' ? (
          <form onSubmit={submit} className="p-6 space-y-5">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div>
              <div className="text-sm font-semibold text-slate-800 mb-2">Rating</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => {
                  const active = (hoverRating || rating) >= v
                  return (
                    <button
                      key={v}
                      type="button"
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(v)}
                      className="p-1 rounded-lg hover:bg-slate-50"
                      aria-label={`Rating ${v}`}
                    >
                      <Star size={24} className={active ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    </button>
                  )
                })}
                <span className="ml-2 text-sm text-slate-500">{rating ? `${rating}/5` : 'Pilih rating'}</span>
              </div>
              {rating > 0 && rating < 3 ? (
                <div className="mt-2 text-xs text-slate-500">Rating di bawah 3 wajib mengisi komentar.</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Kategori</label>
              <select
                value={categoryUi}
                onChange={(e) => setCategoryUi(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Bug">Bug</option>
                <option value="Saran">Saran</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Komentar</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Ceritakan kendalanya atau sarannya..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{rating > 0 && rating < 3 ? 'Wajib diisi' : 'Opsional'}</span>
                <span>{sanitizeComment(comment).length}/{MAX_COMMENT}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  'Kirim'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Star className="text-green-600 fill-green-600" size={32} />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-2">Terima Kasih!</h4>
            <p className="text-slate-500 text-sm max-w-[240px]">
              Feedback kamu berhasil terkirim. Masukanmu sangat berharga bagi kami.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

